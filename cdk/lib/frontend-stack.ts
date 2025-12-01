import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';

interface FrontendStackProps extends cdk.StackProps {
    backendDnsName: string;
}

export class FrontendStack extends cdk.Stack {
    public readonly distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        // S3 Bucket
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev/test
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        // CloudFront Function for SPA routing
        // This runs at viewer-request stage and rewrites routes to /index.html
        // BEFORE the request is routed to an origin
        const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
            code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Don't rewrite API requests
    if (uri.startsWith('/api/')) {
        return request;
    }
    
    // Don't rewrite if URI has a file extension (static assets)
    if (uri.match(/\\.[a-zA-Z0-9]+$/)) {
        return request;
    }
    
    // For everything else (routes like /login, /register), serve index.html
    request.uri = '/index.html';
    
    return request;
}
            `),
        });

        // Origin Access Control for S3 (modern approach instead of deprecated S3Origin)
        const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket);

        // Cache policy for static assets (JS, CSS with hashed names - cache for 1 year)
        const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
            cachePolicyName: 'VimaDimension-StaticAssets',
            comment: 'Cache static assets with content hashes for 1 year',
            defaultTtl: cdk.Duration.days(365),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
        });

        // Cache policy for HTML and other dynamic content (no caching or very short TTL)
        const htmlCachePolicy = new cloudfront.CachePolicy(this, 'HtmlCachePolicy', {
            cachePolicyName: 'VimaDimension-Html',
            comment: 'Minimal caching for HTML files',
            defaultTtl: cdk.Duration.seconds(0),
            maxTtl: cdk.Duration.seconds(1),
            minTtl: cdk.Duration.seconds(0),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
        });


        // CloudFront Distribution
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: s3Origin,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: htmlCachePolicy, // Use no-cache policy for default (index.html)
                functionAssociations: [{
                    function: spaRoutingFunction,
                    eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                }],
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html', // For SPA routing
                    ttl: cdk.Duration.seconds(0), // Don't cache error responses
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html', // S3 returns 403 for missing objects
                    ttl: cdk.Duration.seconds(0),
                },
            ],
            additionalBehaviors: {
                // Cache static assets (JS/CSS) with content hashes for long time
                '/static/*': {
                    origin: s3Origin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: staticAssetsCachePolicy,
                },
                // Cache images
                '/images/*': {
                    origin: s3Origin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: staticAssetsCachePolicy,
                },
                '/api/*': {
                    origin: new origins.HttpOrigin(props.backendDnsName, {
                        httpPort: 80,
                        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
                    }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                },
            },
        });


        // Deploy Frontend Assets with proper cache control headers
        // Deploy all assets at once, only invalidate index.html to avoid timeout
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/build'))],
            destinationBucket: websiteBucket,
            distribution: this.distribution,
            // Only invalidate index.html - this is fast and the key file
            // Static assets have content hashes, images rarely change
            distributionPaths: ['/index.html'],
            cacheControl: [
                // Default to short cache for HTML files
                s3deploy.CacheControl.maxAge(cdk.Duration.seconds(0)),
                s3deploy.CacheControl.mustRevalidate(),
            ],
            memoryLimit: 1024, // Increase memory for faster processing
        });

        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: this.distribution.distributionDomainName,
        });
    }
}
