import 'reflect-metadata';

import dotenv from 'dotenv';
dotenv.config();

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import dynamoose from 'dynamoose';
import cors from 'cors';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { buildSchema } from './graphql/schema';
import http from 'http';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import cookieParser from 'cookie-parser';
import { verify } from 'jsonwebtoken';
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} from './graphql/constants/tokens';
import { DBService } from './database/DBService';
import { createTokens } from './auth/authUtils';

// declare namespace Express {
//   export interface Request {
//     userKey?: string;
//   }
// }
declare global {
  namespace Express {
    interface Request {
      userKey: string;
    }
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

  app.use('/graphql', express.json());

  // NOTE: 'trust proxy' should not be set to true in production; this is needed for
  // setting cookies
  // NOTE: apollo client also needs "Include cookies" turned on; and, a shared header added
  // Header: name: "x-forwarded-proto" value: "https"
  app.set('trust proxy', true);

  app.use(cookieParser());
  app.use(async (req, res, next) => {
    // check for existing login/access information to see if we already have valid credentials
    // if so, we can skip the login process (which must hit the database)
    // if not, abort the current request and require the user to log in
    const dbService = new DBService();
    console.log(req.cookies);
    const accessToken = req.cookies['access-token'];
    const refreshToken = req.cookies['refresh-token'];

    if (!accessToken && !refreshToken) {
      console.log('access and refresh tokens invalid');
      return next();
    }

    // verify access token
    try {
      const data = verify(accessToken, ACCESS_TOKEN_SECRET) as any;
      console.log('valid access token');
      req.userKey = data.userKey;
      return next();
    } catch {
      console.log('access token invalid');
    }

    // access token didn't work; so, try verifying the refresh token
    if (!refreshToken) {
      console.log('refresh token invalid');
      return next();
    }

    let data;
    // verify refresh token
    console.log('need to verify refresh token');
    try {
      data = verify(refreshToken, REFRESH_TOKEN_SECRET) as any;
      console.log('valid refresh token');
    } catch {
      console.log('refresh token invalid');
      return next();
    }
    const user = await dbService.getUser(data!.userKey);
    if (!user || user.refreshTokenCount !== data!.refreshTokenCount) {
      console.log('refresh token count does not match');
      return next();
    }

    const tokens = createTokens(user);

    res.cookie('refresh-token', tokens.refreshToken); // a new refresh token here will basically keep users logged in as long as they have refreshed within 7 days
    res.cookie('access-token', tokens.accessToken);
    req.userKey = user.userKey;
    next();
  });

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
