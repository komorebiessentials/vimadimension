import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

interface BackendStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    dbSecurityGroup: ec2.SecurityGroup;
    secret: secretsmanager.ISecret;
    sesSecret: secretsmanager.ISecret;
    senderEmail: string;
}

export class BackendStack extends cdk.Stack {
    public readonly instance: ec2.Instance;
    public readonly uploadsBucket: s3.Bucket;
    public readonly publicDnsName: string;

    constructor(scope: Construct, id: string, props: BackendStackProps) {
        super(scope, id, props);

        // ==================== S3 BUCKET FOR FILE UPLOADS ====================
        // IMPORTANT: Update this value after each new CloudFront deployment
        const CLOUDFRONT_DOMAIN = 'd3esaqi72ck9uv.cloudfront.net';

        this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
            bucketName: `archiease-uploads-${this.account}-${this.region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: false,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                    ],
                    allowedOrigins: [`https://${CLOUDFRONT_DOMAIN}`, 'http://localhost:3000'],
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                },
            ],
            lifecycleRules: [
                {
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(90),
                        },
                    ],
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
                },
            ],
        });

        new cdk.CfnOutput(this, 'UploadsBucketName', {
            value: this.uploadsBucket.bucketName,
            description: 'S3 bucket for file uploads',
            exportName: 'UploadsBucketName',
        });

        // ==================== IAM ROLE ====================
        const role = new iam.Role(this, 'BackendInstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
            ],
        });

        this.uploadsBucket.grantReadWrite(role);
        this.uploadsBucket.grantDelete(role);

        role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'],
        }));

        props.sesSecret.grantRead(role);

        // ==================== DOCKER IMAGE ====================
        // Dynamic ECR URI based on current account and region
        const imageUri = `${this.account}.dkr.ecr.${this.region}.amazonaws.com/cdk-hnb659fds-container-assets-${this.account}-${this.region}:v20260122-deploy-bom`;

        // ==================== AMI ====================
        const ami = new ec2.AmazonLinuxImage({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
            cpuType: ec2.AmazonLinuxCpuType.X86_64,
        });

        // ==================== USER DATA ====================
        const userData = ec2.UserData.forLinux();
        userData.addCommands(
            'yum update -y',
            `echo "Deployment timestamp: ${new Date().toISOString()} - LAZY FIX"`,
            'yum install -y docker jq aws-cli',
            'service docker start',
            'usermod -a -G docker ec2-user',

            // ==================== MEMORY OPTIMIZATION START ====================
            // 1. Create a 2GB Swap File (Virtual RAM from Disk)
            'fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048',
            'chmod 600 /swapfile',
            'mkswap /swapfile',
            'swapon /swapfile',
            // 2. Make it permanent across reboots
            'echo "/swapfile swap swap defaults 0 0" >> /etc/fstab',
            // ==================== MEMORY OPTIMIZATION END ====================

            // Login to ECR
            `aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${imageUri.split('/')[0]}`,

            // Fetch Database Secret
            `SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id ${props.secret.secretName} --query SecretString --output text --region ${this.region})`,
            'DB_HOST=$(echo $SECRET_JSON | jq -r .host)',
            'DB_PORT=$(echo $SECRET_JSON | jq -r .port)',
            'DB_USER=$(echo $SECRET_JSON | jq -r .username)',
            'DB_PASS=$(echo $SECRET_JSON | jq -r .password)',
            'DB_NAME=$(echo $SECRET_JSON | jq -r .dbname)',

            // Fetch SES SMTP Credentials
            `SES_SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id ${props.sesSecret.secretName} --query SecretString --output text --region ${this.region})`,
            'SES_ACCESS_KEY=$(echo $SES_SECRET_JSON | jq -r .accessKeyId)',
            'export SES_SECRET_KEY=$(echo $SES_SECRET_JSON | jq -r .secretAccessKey)',
            'MAIL_HOST=$(echo $SES_SECRET_JSON | jq -r .smtpHost)',
            'MAIL_PORT=$(echo $SES_SECRET_JSON | jq -r .smtpPort)',
            `MAIL_FROM="${props.senderEmail}"`,

            // Convert AWS Secret Access Key to SMTP Password
            `MAIL_PASSWORD=$(python3 <<'PYEOF'
import hmac
import hashlib
import base64
import os
import sys

SMTP_REGIONS = [
    'us-east-2', 'us-east-1', 'us-west-2', 'ap-south-1',
    'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
    'ca-central-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
    'sa-east-1', 'us-gov-west-1', 'af-south-1', 'ap-east-1', 'me-south-1'
]

DATE = "11111111"
SERVICE = "ses"
MESSAGE = "SendRawEmail"
TERMINAL = "aws4_request"
VERSION = 0x04

def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def calculate_key(secret_access_key, region):
    if region not in SMTP_REGIONS:
        raise ValueError(f'Region {region} is not supported')
    
    signature = sign(('AWS4' + secret_access_key).encode('utf-8'), DATE)
    signature = sign(signature, region)
    signature = sign(signature, SERVICE)
    signature = sign(signature, TERMINAL)
    signature = sign(signature, MESSAGE)
    
    signature_and_version = bytes([VERSION]) + signature
    return base64.b64encode(signature_and_version).decode('utf-8')

secret_key = os.environ.get('SES_SECRET_KEY', '')
region = '${this.region}'

try:
    if not secret_key:
        print('ERROR: SES_SECRET_KEY is empty', file=sys.stderr)
        sys.exit(1)
    if not region:
        print('ERROR: Region is empty', file=sys.stderr)
        sys.exit(1)
    smtp_password = calculate_key(secret_key, region)
    if not smtp_password:
        print('ERROR: Failed to generate SMTP password', file=sys.stderr)
        sys.exit(1)
    print(smtp_password)
except Exception as e:
    print(f'ERROR generating SMTP password: {e}', file=sys.stderr)
    sys.exit(1)
PYEOF
)`,
            'if [ -z "$MAIL_PASSWORD" ]; then',
            '  echo "ERROR: Failed to generate SMTP password. Check logs above."',
            '  exit 1',
            'fi',
            'echo "SMTP password generated successfully"',

            // Run Container
            `docker run -d --restart always -p 8080:8080 \\
                -m 1280m \\
                -e JAVA_OPTS="-Xmx768m -Xms256m -XX:+UseSerialGC" \\
                -e SPRING_PROFILES_ACTIVE=prod \\
                -e SPRING_DATASOURCE_URL="jdbc:mysql://\${DB_HOST}:\${DB_PORT}/\${DB_NAME}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" \\
                -e SPRING_DATASOURCE_USERNAME="\${DB_USER}" \\
                -e SPRING_DATASOURCE_PASSWORD="\${DB_PASS}" \\
                -e SERVER_PORT=8080 \\
                -e SPRING_JPA_HIBERNATE_DDL_AUTO=validate \\
                -e APP_CORS_ALLOWED_ORIGINS="https://${CLOUDFRONT_DOMAIN},https://archiease.com,https://www.archiease.com" \\
                -e MAIL_HOST="\${MAIL_HOST}" \\
                -e MAIL_PORT="\${MAIL_PORT}" \\
                -e MAIL_USERNAME="\${SES_ACCESS_KEY}" \\
                -e MAIL_PASSWORD="\${MAIL_PASSWORD}" \\
                -e MAIL_FROM="\${MAIL_FROM}" \\
                -e APP_FRONTEND_URL="https://www.archiease.com" \\
                -e APP_NAME="ArchiEase" \\
                -e AWS_S3_BUCKET="${this.uploadsBucket.bucketName}" \\
                -e AWS_REGION="${this.region}" \\
                -e APP_STORAGE_TYPE="s3" \\
                ${imageUri}`
        );

        // ==================== SECURITY GROUP ====================
        const instanceSg = new ec2.SecurityGroup(this, 'InstanceSG', {
            vpc: props.vpc,
            description: 'Security Group for Backend EC2 Instance',
            allowAllOutbound: true,
        });

        // Allow SSH for debugging (via SSM is preferred, but keeping for flexibility)
        instanceSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH');

        // Allow HTTP on port 8080 from CloudFront (CloudFront IPs are dynamic, so allowing all)
        instanceSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), 'Allow HTTP from CloudFront');

        // ==================== KEY PAIR (Optional, for debugging) ====================
        // const keyPair = new ec2.KeyPair(this, 'BackendKeyPair', {
        //     name: 'backend-key-pair',
        // });

        // ==================== EC2 INSTANCE ====================
        this.instance = new ec2.Instance(this, 'BackendInstance', {
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
            machineImage: ami,
            securityGroup: instanceSg,
            role: role,
            userData: userData,
            // keyName: keyPair.keyName, // Optional
        });

        // ==================== ELASTIC IP ====================
        const eip = new ec2.CfnEIP(this, 'BackendEIP', {
            domain: 'vpc',
        });

        new ec2.CfnEIPAssociation(this, 'EIPAssociation', {
            allocationId: eip.attrAllocationId,
            instanceId: this.instance.instanceId,
        });

        // Export the EC2 public DNS name for CloudFront (CloudFront requires hostname, not IP)
        this.publicDnsName = this.instance.instancePublicDnsName;

        new cdk.CfnOutput(this, 'BackendPublicDnsName', {
            value: this.publicDnsName,
            description: 'Public DNS name of the backend instance',
            exportName: 'BackendPublicDnsName',
        });

        new cdk.CfnOutput(this, 'BackendInstanceId', {
            value: this.instance.instanceId,
            description: 'Instance ID of the backend EC2',
        });

        // ==================== DATABASE ACCESS ====================
        new ec2.CfnSecurityGroupIngress(this, 'AllowInstanceToDb', {
            groupId: props.dbSecurityGroup.securityGroupId,
            ipProtocol: 'tcp',
            fromPort: 3306,
            toPort: 3306,
            sourceSecurityGroupId: instanceSg.securityGroupId,
            description: 'Allow MySQL from Backend Instance',
        });
    }
}
