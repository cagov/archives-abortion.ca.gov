const crypto = require('crypto');
const aws = require('aws-sdk');

const s3 = new aws.S3({ 
  region: 'us-west-1',
  apiVersion: '2006-03-01' 
});

exports.handler = async (event) => {
  const salt = crypto.randomBytes(32).toString('base64');
  
  await s3.putObject({
    Bucket: 'cloudfront-analytics-logs-processing',
    Key: 'crypto/salt.txt',
    Body: salt,
    ContentType: 'text/plain'
  }).promise()
    .then(res => console.log('Salt successfully updated.'))
    .catch(error => console.error('Salt update failed.', error.stack));
};
