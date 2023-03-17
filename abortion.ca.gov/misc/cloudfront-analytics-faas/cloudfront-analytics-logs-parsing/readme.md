# The Cloudfront log parser

This Lambda function is part of our Cloudfront Usage Analytics solution. 

The Cloudfront log parser reads logs from Cloudfront out of S3. It then performs a few actions.

* Translates the IP address in the log into country, state, and city.
* Translates the User-Agent string into browser and OS.
* Encodes a sessions ID for the user based on date, IP, User-Agent, and daily salt.
* Writes a new log file to S3 with this processed information.
* Deletes the original Cloudfront log file from S3.

## Considerations 

* Modify the execution role. We need to grant access to S3. Here’s an example of the policy. 

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

* Set up environment variables. You’ll need the following.
  * CRYPTO_BUCKET: The S3 bucket where the daily salt is stored.
  * SALT_KET: The filename for the daily salt.
  * GEO_DB_BUCKET: The S3 bucket where the geolocation database is stored.
  * GEO_DB_KEY: The filename for the geolocation database. (In this case, it's the DBIP City Lite database.)

* Set up the S3 trigger with the following details.
  * Point it to the S3 bucket we set up previously.
  * Event type: All object creation events
  * Prefix: cf_log
  * Suffix: .gz

* Consider increasing the available memory up to 512MB.