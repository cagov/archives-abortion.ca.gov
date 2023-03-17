const aws = require('aws-sdk');
const { Pool } = require('pg');

const s3 = new aws.S3({ 
  region: 'us-west-1',
  apiVersion: '2006-03-01' 
});

const secrets = new aws.SecretsManager({
  region: 'us-west-1'
});

exports.handler = async (event) => {
  // Get the database credentials from Secrets Manager.
  const SecretId = process.env.SECRET_ID;
  const credentials = await secrets.getSecretValue({ SecretId })
    .promise()
    .then((data) => JSON.parse(data.SecretString))
    .catch((error) => {
      console.error('Could not retrieve credentials from Secrets Manager.', error.stack);
      throw error;
    });
  
  console.log('Database credentials fetched from Secrets Manager.');

  // Set up the connection pool to the database.
  const pgPool = new Pool({
    user: credentials.username,
    host: credentials.host,
    database: credentials.database,
    password: credentials.password,
    port: credentials.port
  });

  console.log('Database connected.');

  // Process each new log file in S3.
  const eventRecords = event.Records.map(record => {
    const Bucket = record.s3.bucket.name;
    const Key = record.s3.object.key;

    return new Promise(async (resolve, reject) => {
      // Fetch the log file from S3.
      const logFile = await s3.getObject({ 
        Bucket, 
        Key 
      }).promise()
        .then(response => {
          console.log(`Processed log file downloaded from S3. Key: ${Key}; Bucket: ${Bucket}.`);
          return JSON.parse(response.Body);
        })
        .catch(error => {
          console.error('Unable to download processed log file from S3.', error, { Bucket, Key });
          reject(error);
        });
      
      resolve(logFile);
    }).then(async logFile => {
      // Insert each new log entry into the database.
      const dbWrites = logFile.map((entry) => {
        const {
          session_id,
          date,
          domain,
          path,
          status,
          referrer_domain,
          country,
          state,
          city,
          browser,
          os
        } = entry; 
      
        return pgPool.query({
          text: 'INSERT INTO page_hits(session_id, date, domain, path, status, referrer_domain, country, state, city, browser, os) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          values: [ session_id, date, domain, path, status, referrer_domain, country, state, city, browser, os ]
        }).then(response => {
          // console.log(response);
        }).catch(error => {
          console.error(`Unable to insert record into database.`, error.stack);
        })
      });

      // Wait for all database writes to complete.
      await Promise.all(dbWrites);

      console.log(`${logFile.length} records written to database.`);

      // Delete the log file from S3. We don't need it anymore.
      await s3.deleteObject({ Bucket, Key })
        .promise()
        .then(() => console.log('Log file deleted from S3.'))
        .catch((error) => {
          console.error('Log file deletion from S3 failed.', error, { Bucket, Key });
        });

    });
  });

  // Wait for all new log files to be processed.
  await Promise.all(eventRecords);

  // Close down the database connection before the Lambda exits. Critical!
  await pgPool
    .end()
    .then(() => console.log('Database disconnected.'))
    .catch((error) => console.error('Error disconnecting from database.', error.stack));
};