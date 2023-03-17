# The query bot

This Lambda function is part of our Cloudfront Usage Analytics solution. 

The query bot is not an active piece of the application. We use it to manually connect to the database, whenever needed.

> This is not the most efficient way to connect to the database. But it has the advantage of being wired into the database’s VPC, Security Group, and RDS Proxy. It uses the same production set-up as our other Lambda functions. 
> I highly recommend finding a more efficient means of connecting to the DB if you have the time and appetite.

## Considerations

* Modify the execution role. Ve need to grant access to Secrets Manager. Here’s an example of the policy.

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
        }
    ]
}
```

* Set up the environment variable. All we need here is a `SECRET_ID` variable, with a value of your database secret name (the name, not the ARN).

* If you're using AWS RDS...
  * Set up the VPC. Use the same VPC, subnets, and Security Group used for the RDS database.
  * Set up the database proxy. Select the RDS Proxy for your database.
