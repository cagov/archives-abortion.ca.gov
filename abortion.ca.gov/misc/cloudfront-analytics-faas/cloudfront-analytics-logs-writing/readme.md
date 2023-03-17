# The database writer

This Lambda function is part of our Cloudfront Usage Analytics solution. 

The database writer takes the clean logs produced by Cloudfront log parser, and writes those logs to a Postgres database.

## Considerations

* Modify the execution role. We need to grant access to S3 and Secrets Manager. Here’s an example of the policy.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "1",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetResourcePolicy",
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret",
                "secretsmanager:ListSecretVersionIds"
            ],
            "Resource": [
                "arn:aws:secretsmanager:us-west-1:YOUR-ACCOUNT-ID:secret:YOUR-SECRET-ARN"
            ]
        },
        {
            "Sid": "2",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetRandomPassword",
                "secretsmanager:ListSecrets"
            ],
            "Resource": "*"
        },
        {
            "Sid": "3",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET/*"
        }
    ]
}
```

* Set up the environment variable. All we need here is a SECRET_ID variable, with a value of your database secret name (the name, not the ARN).

* Set up the S3 trigger with the following details.
  * Point it to the S3 bucket we set up previously.
  * Event type: All object creation events
  * Prefix: processed
  * Suffix: .json

* If you're using AWS RDS...
  * Set up the VPC. Use the same VPC, subnets, and Security Group used for the RDS database.
  * Set up the database proxy. Select the RDS Proxy for your database.