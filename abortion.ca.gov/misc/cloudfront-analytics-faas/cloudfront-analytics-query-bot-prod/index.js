const aws = require('aws-sdk');
const { Pool } = require('pg')

let pgPool = false;

const secrets = new aws.SecretsManager({
  region: 'us-west-1'
});

exports.handler = async (event) => {
  let response;
  
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

  if (!pgPool) {
    pgPool = new Pool({
      user: credentials.username,
      host: credentials.host,
      database: credentials.database,
      password: credentials.password,
      port: credentials.port
    });
    
    console.log(`Connected to database: ${credentials.database}.`);
  }

  await pgPool.query({
    text: `CREATE TABLE IF NOT EXISTS page_hits (
      id serial PRIMARY KEY, 
      session_id VARCHAR(64),
      date TIMESTAMP, 
      domain VARCHAR(250),
      path VARCHAR(2050),
      status VARCHAR(3),
      referrer_domain VARCHAR(250),
      country VARCHAR(250),
      state VARCHAR(250),
      city VARCHAR(250),
      browser VARCHAR(150),
      os VARCHAR(150)
    );`
  }).then(res => {
    console.log('page_hits table is available.');
  }).catch(error => {
    console.log(console.error(error.stack));
  });

  await pgPool.query({
    text: 'SELECT * FROM page_hits ORDER BY id DESC LIMIT 100;'
  }).then(res => {
    response = res.rows;
  }).catch(error => {
    console.log(console.error(error.stack));
  });
  
  return response;
};