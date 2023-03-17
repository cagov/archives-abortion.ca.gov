const aws = require('aws-sdk');
const mmdb = require('mmdb-lib');
const { UAParser } = require('ua-parser-js');
const zlib = require('zlib');
const readline = require('readline');
const crypto = require('crypto');

const s3 = new aws.S3({ 
  region: 'us-west-1',
  apiVersion: '2006-03-01' 
});

exports.handler = async (event) => {
  const geoDBBucket = process.env.GEO_DB_BUCKET;
  const geoDBKey = process.env.GEO_DB_KEY;
  const cryptoBucket = process.env.CRYPTO_BUCKET;
  const saltKey = process.env.SALT_KEY;
  
  // Grab the daily salt from S3.
  const salt = await s3.getObject({
    Bucket: cryptoBucket,
    Key: saltKey
  }).promise()
    .then(response => {
      console.log('Daily salt retrieved.');
      return response.Body;
    })
    .catch(error => {
      console.error('Unable to download daily salt.', error, { cryptoBucket, saltKey });
      throw error;
    });

  // Download the geolocation database from S3.
  const geoDB = await s3.getObject({
    Bucket: geoDBBucket,
    Key: geoDBKey
  }).promise()
    .then(response => {
      console.log(`Geolocation database downloaded. Key: ${geoDBKey}; Bucket: ${geoDBBucket}.`);
      return response.Body;
    })
    .catch(error => {
      console.error('Unable to download geolocation database.', error, { geoDBBucket, geoDBKey });
      throw error;
    });
  
  // Set up geolocator.
  const geoReader = new mmdb.Reader(geoDB);

  // Set up User-Agent string parser.
  const uaParser = new UAParser();

  // Process each new log file in S3.
  const eventRecords = event.Records.map(record => {
    const Bucket = record.s3.bucket.name;
    const Key = record.s3.object.key;

    return new Promise(async (resolve, reject) => {
      // Stream the log file from S3.
      const stream = s3.getObject({ Bucket, Key })
        .createReadStream()
        .pipe(zlib.createGunzip()); // <== Note the need to unzip during the stream.
  
      // Create a per-line stream reader for the log file.
      const streamReader = readline.createInterface({ input: stream });

      const logEntries = [];
      
      // Do all the following for each streamed line of the log file.
      streamReader.on('line', (line) => {
        // We will skip rows that start with '#'.
        if (!line.startsWith('#')) {
          // Parse each TSV row of the log file.
          const fields = line.split("\t");
  
          // Fetch basic fields from log file row.
          const date = fields[0];
          const ip = fields[4];
          const path = fields[7];
          const status = fields[8];
          const referrer = fields[9];
          const userAgent = fields[10];
          const domain = fields[15];
          const contentType = fields[29];
          
          // Parse User-Agent string.
          uaParser.setUA(userAgent.replaceAll('%20', ' '));
          const browser = uaParser.getBrowser()?.name || '';
          const os = uaParser.getOS()?.name || '';
        
          // Determine user's rough location by city.
          const geolocation = geoReader.get(ip);
          
          const city = geolocation?.city?.names?.en || '';
          const country = geolocation?.country?.names?.en || '';
          const state = geolocation?.subdivisions?.map(m => m.names.en)?.join(', ') || '';
          
          let referrer_domain;

          // Parse referrer information.
          try {
            let u = new URL(referrer);
            referrer_domain = u.hostname;
          } catch {
            referrer_domain = '';
          }
          
          // Create cryptographic session ID.
          const hashable = `${date}${ip}${userAgent}${salt}`;
          const session_id = crypto
            .createHash('sha256')
            .update(hashable)
            .digest('hex');
            
          const nonHTMLSuffixes = [
            '.png', 
            '.ico', 
            '.svg'
          ];
          
          // Check to see if the path is a non-HTML file.
          // Helps catch some files that get logged with wrong content-type.
          const includesBadSuffix = nonHTMLSuffixes.some(suffix => path.endsWith(suffix));
  
          // We're only writing HTML requests to our database.
          // This is our way of limiting log entries to page hits (as opposed to images, etc.).
          // We will also exclude Route53 health checks
          if (contentType === 'text/html' && !userAgent.includes('Route53')) {
            // Queue this entry for a write.
            logEntries.push({
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
            });
          }
        }
      });

      // By putting the stream events inside a Promise, we can *await* said events.
      // This ensures the entire stream is done before the code proceeds and the Lambda dies.
      await new Promise(() => {
        stream.on('end', () => {
          console.log(`Log file successfully streamed from S3. Key: ${Key}; Bucket: ${Bucket}.`);
          resolve(logEntries);
        });
        stream.on('error', (error) => {
          console.error('S3 file stream failed.', error, { Bucket, Key })
          reject(error);
        });
      });
    }).then(async logEntries => {
      const newLogFileName = `processed/${Key.replace('.gz', '').replace('cf_log/', '')}.json`;
      const formattedLogs = JSON.stringify(logEntries, null, 2);

      if (logEntries.length > 0) {
        // Write the processed log entries to a clean JSON file in S3.
        await s3.putObject({
          Bucket,
          Key: newLogFileName,
          Body: formattedLogs,
          ContentType: 'application/json'
        }).promise()

        console.log(`${logEntries.length} records written to processed log file in S3. Key: ${newLogFileName}; Bucket: ${Bucket}.`);
      } else {
        console.log('No records to process further.');
      }

      // Delete the original log file from S3. We don't need it anymore.
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
};