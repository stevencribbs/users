const DynamoDBClient = require('@aws-sdk/client-dynamodb');
const DynamoDBLib = require('@aws-sdk/lib-dynamodb');
// import {
//   BatchWriteCommand,
//   DeleteCommand,
//   DynamoDBDocumentClient,
//   GetCommand,
//   PutCommand,
//   UpdateCommand,
//   paginateQuery,
//   paginateScan,
// } from '@aws-sdk/lib-dynamodb';

const usersTableName = 'users';

// const clientConfig = new DynamoDBClientConfigType({ accesKeyId: 'fakekey' });
const client = new DynamoDBClient.DynamoDBClient({
  endpoint: 'http://localhost:8000',
  // endpoint: 'http://localstack.localhost.rktsvc.com:4566',
  region: 'local',
  credentials: {
    accessKeyId: 'fakekey',
    secretAccessKey: 'fakekey',
  },
});
const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);

const deleteUserTable = async () => {
  const command = new DynamoDBClient.DeleteTableCommand({
    TableName: usersTableName,
  });
  console.log(`deleting table: ${usersTableName}`);
  try {
    const response = await client.send(command);
    console.log('table deleted');
    console.log(response);
    // return response;
  } catch (err) {
    if (err.message.includes('non-existent table')) {
      console.log(
        `Could not delete table. The table "${usersTableName}" does not exist.`
      );
    } else {
      console.log(err);
    }
  }
};

const createUserTable = async () => {
  // Info on syntax can be found in the API reference for CreateTable at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
  const command = new DynamoDBClient.CreateTableCommand({
    TableName: usersTableName,
    AttributeDefinitions: [
      {
        AttributeName: 'userKey',
        AttributeType: 'S',
      },
      {
        AttributeName: 'email',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'userKey',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'email',
        KeyType: 'RANGE',
      },
    ],
    // LocalSecondaryIndexes: [
    //   {
    //     IndexName: 'userEmailIndex',
    //     KeySchema: [
    //       {
    //         AttributeName: 'email',
    //         KeyType: 'HASH',
    //       },
    //       {
    //         AttributeName: 'userKey',
    //         KeyType: 'RANGE',
    //       },
    //     ],
    //     Projection: {
    //       ProjectionType: 'ALL',
    //     },
    //   },
    // ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  console.log(`creating table: ${usersTableName}`);
  try {
    const response = await client.send(command);
    console.log('table created');
    console.log(response);
  } catch (err) {
    console.log(err);
  }
};

const addInitialUser = async () => {
  const ItemsArray = [
    {
      PutRequest: {
        Item: {
          userKey: 'u123',
          firstName: 'Larry',
          lastName: 'Cucumber',
          email: 'larry@cucumber.com',
          password: 'test',
          confirmed: true,
          refreshTokenCount: 0,
        },
      },
    },
    {
      PutRequest: {
        Item: {
          userKey: 'u456',
          firstName: 'Bob',
          lastName: 'Tomato',
          email: 'bob@tomato.com',
          password: 'test',
          confirmed: true,
          refreshTokenCount: 0,
        },
      },
    },
  ];
  console.log(ItemsArray);
  const command = new DynamoDBLib.BatchWriteCommand({
    RequestItems: {
      [usersTableName]: ItemsArray,
    },
  });

  console.log(`populating table ${usersTableName} with initial data set`);
  try {
    const response = await docClient.send(command);
    console.log('table populated');
    console.log('BatchWriteResponse: ' + response);
  } catch (err) {
    if (err.message.includes('non-existent table')) {
      console.log(
        `Could not populate table. The table "${TableName}" does not exist.`
      );
    } else {
      console.log('BatchWriteResponse: ' + err);
    }
  }
};

const main = async () => {
  if (process.argv.includes('-init')) {
    await deleteUserTable();
    await createUserTable();
  } else {
    if (process.argv.includes('-d')) {
      await deleteUserTable();
    }
    if (process.argv.includes('-c')) {
      await createUserTable();
    }
  }

  if (process.argv.includes('-p')) {
    await addInitialUser();
  }
};

main();
