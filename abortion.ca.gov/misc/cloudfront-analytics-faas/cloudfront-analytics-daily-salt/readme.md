# The daily salt

This Lambda function is part of our Cloudfront Usage Analytics solution. 

We use the daily salt to encode user sessions. We write the salt to a text file in S3, `crypto/salt.txt`, and we rotate it every day.

## Considerations

* Set up a daily trigger on the Lambda function. There are many ways to do this, so I leave it as an exercise for the reader. I’d recommend using AWS EventBridge.

* Modify the execution role with permissions to your S3 bucket. You’ll need to allow PutObject, GetObject, and DeleteObject. Here’s an example of the policy.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "1",
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

* Note that `crypto` is provided by Node.js, and `aws-sdk` is baked into the Lambda environment. You won’t need to install any JS dependencies.