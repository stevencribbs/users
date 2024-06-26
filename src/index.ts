import 'reflect-metadata';

import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import dynamoose from 'dynamoose';
import session, { SessionOptions } from 'express-session';
import RedisStore from 'connect-redis';
import cors from 'cors';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { buildSchema } from './graphql/schema';
import { redisClient } from './redis';
import http from 'http';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';

// Augment express-session with a custom SessionData object
declare module 'express-session' {
  interface SessionData {
    userKey: string;
  }
}

const main = async () => {
  const dynamoDbEndpoint = 'http://localhost:8000';
  // const dynamoDbEndpoint = 'http://localstack.localhost.rktsvc.com:4566';
  dynamoose.aws.ddb.local(dynamoDbEndpoint);

  const schema = await buildSchema();

  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    schema,
    formatError: (formattedError: GraphQLFormattedError, error) =>
      formattedError, // custom validator can be applied here
    plugins: [
      // Install a landing page plugin based on NODE_ENV
      process.env.NODE_ENV === 'production'
        ? ApolloServerPluginLandingPageProductionDefault({
            graphRef: 'my-graph-id@my-graph-variant',
            footer: false,
          })
        : ApolloServerPluginLandingPageLocalDefault({
            footer: false,
            embed: true,
            includeCookies: true,
          }),
    ],
  });

  await apolloServer.start();

  app.use(
    cors({
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true, // 'Access-Control-Allow-Credentials',
      origin: [
        'https://studio.apollographql.com',
        'https://sandbox.embed.apollographql.com',
        'http://localhost:4000/graphql',
      ], // 'Access-Control-Allow-Origin',,
      // origin: '*',
      methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD'],
    }),
  );

  let sessionRedisStore;
  if (process.env.USE_REDIS === 'yes') {
    console.log('yes Redis');
    // @ts-ignore
    sessionRedisStore = new RedisStore({ client: redisClient as any });
  } else {
    console.log('no Redis');
  }

  app.use(
    '/graphql',
    express.json(),
    session({
      // Setting the store will then persist the session in redis
      store: sessionRedisStore,
      name: 'qid',
      secret: 'aslkdfjoiq12312',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production',
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7 * 365, // 7 years
        sameSite: 'lax', // for production, this should likely be 'none'
      },
    }),
  );

  // NOTE: 'trust proxy' should not be set to true in production; this is needed for
  // setting cookies
  // NOTE: apollo client also needs "Include cookies" turned on; and, a shared header added
  // Header: name: "x-forwarded-proto" value: "https"
  app.set('trust proxy', true);

  app.use(
    // NOTE: Since the request session interface is extended to include the userKey,
    // setting up the context, which accesses the session object, must be done after
    // initializing the session configuration.
    expressMiddleware(apolloServer, {
      context: async ({ req, res }: any) => ({ req, res }),
    }),
  );

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve),
  );
  console.log(`🚀 Server ready at http://localhost:4000/graphql`);
};

main();
