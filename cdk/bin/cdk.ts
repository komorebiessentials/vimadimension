#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { SesStack } from '../lib/ses-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-south-1'  // Mumbai for India customers
};

// SES Stack for email sending
const sesStack = new SesStack(app, 'SesStack', {
  env,
  senderEmail: 'no-reply@archiease.com',
});

const networkStack = new NetworkStack(app, 'NetworkStack', { env });

const databaseStack = new DatabaseStack(app, 'DatabaseStack', {
  env,
  vpc: networkStack.vpc,
  securityGroup: networkStack.dbSg,
});

// Backend Stack - EC2 with Elastic IP (no ALB needed)
const backendStack = new BackendStack(app, 'BackendStack', {
  env,
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSg,
  secret: databaseStack.database.secret!,
  sesSecret: sesStack.smtpCredentialsSecret,
  senderEmail: sesStack.senderEmail,
});

// Frontend Stack - CloudFront routes /api/* directly to EC2 public DNS
const frontendStack = new FrontendStack(app, 'FrontendStack', {
  env,
  backendDnsName: backendStack.publicDnsName,
  // backendDnsName: 'temp.archiease.com', // Temporary unlink to fix CloudFormation export issue
});
