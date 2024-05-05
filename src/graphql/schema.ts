import 'reflect-metadata';
import * as typeGraphQL from 'type-graphql';
import { Container } from 'typedi';

import { PingResolver } from './queries/PingResolver';
import { UserQueries } from './queries/UserQueries';
import { RegisterUserMutation } from './mutations/RegisterUser/RegisterUserMutation';
import { LoginMutation } from './mutations/Login/Login';
import { MeResolver } from './queries/MeResolver/Me';
import { CustomContext } from './types/CustomContext';
import { ConfirmUserMutation } from './mutations/ConfirmUser/ConfirmUserMutation';
import { ForgotPasswordMutation } from './mutations/ForgotPassword/ForgotPasswordMutation';
import { ChangePasswordMutation } from './mutations/ChangePassword/ChangePasswordMutation';
import { LogoutMutation } from './mutations/Logout/Logout';
import { InvalidateTokensMutation } from './mutations/InvalidateTokens/InvalidateTokens';

const checkScopes: typeGraphQL.AuthChecker<CustomContext> = (
  { root, args, context },
  requiredRoles,
) => {
  const { req } = context;

  return true;
};

export const buildSchema = async () => {
  return await typeGraphQL.buildSchema({
    resolvers: [
      MeResolver,
      PingResolver,
      UserQueries,
      LoginMutation,
      LogoutMutation,
      RegisterUserMutation,
      ConfirmUserMutation,
      ForgotPasswordMutation,
      ChangePasswordMutation,
      InvalidateTokensMutation,
    ],
    container: Container,
    // validate: { forbidUnknownValues: false },
    validate: true,
    authChecker: checkScopes,
  });
};
