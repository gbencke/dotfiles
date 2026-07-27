# AWS rules — Well-Architected + documented service limits

Static review only (see ADR 0002). Every finding should cite the documented
limit or best practice it violates. Do not invent quotas — if unsure of the
number, state the limit qualitatively and mark severity one level lower.

## Service limits & quotas (the silent killers)

- **API Gateway**: 29s integration timeout. Any backend (Lambda, ALB) with a
  longer timeout behind API Gateway is dead capacity — the caller is already
  gone. Flag `timeout = 900` on a Lambda fronted by API Gateway.
- **Lambda**: 15min max execution; 6MB sync payload; /tmp 512MB default.
  Flag long-running jobs (video, ETL) on Lambda without step functions/chunking.
- **SQS**: 256KB message cap; visibility timeout must exceed the consumer's
  worst-case processing time or messages are processed twice; DLQ missing on
  any queue that feeds non-idempotent consumers.
- **SNS→SQS fan-out** without raw message delivery or filter policies where
  appropriate.
- **DynamoDB**: 400KB item cap; on-demand vs provisioned mismatch with traffic
  pattern; missing point-in-time recovery on tables holding state that matters;
  hot partition keys (single-tenant id as partition key under high write).
- **S3**: list operations are O(prefix) and truncated at 1000 — SDK calls
  without pagination silently drop data (`list_objects`, `listObjectsV2`
  loops missing `IsTruncated`/`ContinuationToken`).
- **SDK defaults**: boto3/aws-sdk calls without pagination (any `list_*`,
  `describe_*`, `scan`); missing retry config on throttling-prone APIs
  (DynamoDB, Kinesis); ignoring `throttling` exceptions.
- **Step Functions**: 256KB state payload; 25k execution history events.

## Well-Architected red flags

- **Security**: public S3 buckets/ACLs; `*` principals or actions in IAM
  policies; missing encryption at rest (S3 default encryption, EBS, RDS);
  secrets hardcoded in templates/env vars instead of Secrets Manager/SSM;
  security groups open to 0.0.0.0/0 on non-80/443 ports; missing
  `block_public_access`.
- **Reliability** (REL01): single-AZ for stateful resources (RDS without
  Multi-AZ, ElastiCache single node) in anything claiming production; no
  health checks on ASGs/ALBs; code that assumes fixed quotas without
  backoff (architect around fixed limits, don't hit them).
- **Performance**: t2/t3 burstable for sustained-CPU workloads; Lambda memory
  left at 128MB default (CPU scales with memory); missing Graviton/arm where
  trivially applicable is P3 at most.
- **Cost**: missing lifecycle rules on S3 buckets with growing data;
  on-demand capacity for predictable steady-state; NAT gateway in front of
  high-volume S3/DynamoDB traffic without VPC endpoints.
- **Operational excellence**: no tags (owner/env/cost-center) on tagged-
  resource types; no CloudWatch alarms on queue depth/Lambda errors for
  critical paths; missing log retention (logs kept forever = cost leak).

## IaC hygiene

- State/resource drift risks: hardcoded ARNs/account IDs; missing `prevent_destroy`
  on irreplaceable stateful resources; wildcard `resource = "*"` scoped
  permissions "temporarily".
- CloudFormation/CDK: `RemovalPolicy.DESTROY` on databases/buckets in prod
  stacks.

Cite the rule id (e.g. `aws#sqs-visibility`) in every finding's evidence.
