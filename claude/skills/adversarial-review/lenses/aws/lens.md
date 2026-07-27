---
name: aws
description: AWS services best practices and documented limits/quotas, in IaC and SDK code.
signals:
  - "*.tf"
  - "*.template"
  - "template.yaml"
  - "serverless.yml"
  - "cdk.json"
  - "pulumi.yaml"
  - "boto3"
  - "@aws-sdk"
  - "aws-sdk"
---

# aws lens

Applies when the repo provisions AWS infrastructure (Terraform, CDK,
CloudFormation, Serverless, Pulumi) or calls AWS APIs via SDK code.
