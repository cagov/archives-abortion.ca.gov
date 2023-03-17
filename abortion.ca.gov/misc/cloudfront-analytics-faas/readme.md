# Cloudfront Usage Analytics

Cloudfront Usage Analytics provides usage statistics for a Cloudfront-served web site. It serves the same purpose as products like Google Analytics. 

Unlike Google Analytics, this approach helps us maximize the privacy of our readers. This privacy is advanced both by limiting the information we collect and by keeping it all in-house.

We built this to help track usage on abortion.ca.gov, for which user privacy is paramount.

## High-level architecture

This solution is built entirely within AWS. Here are the AWS products in play.

* Cloudfront
* S3
* Lambda
* EventBridge
* RDS 
  * RDS Aurora
  * RDS Proxy
* VPC
  * VPC Endpoints
  * VPC Subnets
  * VPC Security Groups
* Quicksight
* Secrets Manager

Refer to additional documentation, provided during hand-off, for more information on setting up this infrastructure.

## End-to-end process

### Every day

On a daily schedule, EventBridge triggers our first function, `cloudfront-analytics-daily-salt`.

* `cloudfront-analytics-daily-salt` generates a randomized salt.
* `cloudfront-analytics-daily-salt` uploads this daily salt to S3.

This salt will be used later to create safe session IDs for each visitor.

### For each visit

1. User visits Cloudfront-served site.
2. Cloudfront delivers usage log file to S3 bucket. (Every few minutes.)
3. S3 immediately triggers Lambda function to process the Cloudfront log file.
4. `cloudfront-analytics-logs-parsing` function parses the log file.
  1. `cloudfront-analytics-logs-parsing` downloads the log file from S3.
  2. `cloudfront-analytics-logs-parsing` downloads the daily salt from S3.
  3. `cloudfront-analytics-logs-parsing` downloads geolocation database from S3.
  4. `cloudfront-analytics-logs-parsing` inspects each entry of the log file.
    1. User-agent string is parsed into user’s browser and OS.
    2. User’s IP is translated into country, state, and city.
    3. Content-type of the page is checked to ensure it’s an HTML page. We discard other hits to images, fonts, etc.
    4. The user’s session is encoded in a cryptographic hash consisting of date, IP, user-agent, and the daily salt.
  5. `cloudfront-analytics-logs-parsing` writes a new JSON file to the same S3 bucket. This new JSON file is limited to the fields we actually want to track. All other sensitive information is omitted.
  6. `cloudfront-analytics-logs-parsing` immediately deletes the original Cloudfront log file from S3.
5. S3 immediately triggers another Lambda function to process this new JSON file.
6. `cloudfront-analytics-logs-writing` function processes the JSON file.
  1. `cloudfront-analytics-logs-writing` downloads RDS Aurora database credentials from Secrets Manager.
  2. `cloudfront-analytics-logs-writing` connects to RDS Proxy.
  3. `cloudfront-analytics-logs-writing` uploads each record from JSON file into the RDS Aurora database.
  4. `cloudfront-analytics-logs-writing` immediately deletes JSON file from S3 bucket.
7. Quicksight fetches the latest data from the RDS Aurora database.
8. State staff check usage stats in Quicksight dashboard.