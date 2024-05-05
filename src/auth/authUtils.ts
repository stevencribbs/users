import { sign } from 'jsonwebtoken';
import { UserOutput } from '../graphql/outputs/user';
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} from '../graphql/constants/tokens';

export const createTokens = (user: UserOutput) => {
  const refreshToken = sign(
    { userKey: user.userKey, refreshTokenCount: user.refreshTokenCount },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  );
  const accessToken = sign({ userKey: user.userKey }, ACCESS_TOKEN_SECRET, {
    expiresIn: '5min',
  });

  return { refreshToken, accessToken };
};
