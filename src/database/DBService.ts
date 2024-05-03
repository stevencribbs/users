import { Service } from 'typedi';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { UserModel } from './models/User';
import { UserOutput } from '../graphql/outputs/user';
import { updateUserOptions } from 'src/graphql/types/updateOptions';

@Service()
export class DBService {
  async registerUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) {
    const newUserKey: string = uuid();
    const hashedPassword = await bcrypt.hash(password, 12);

    //TODO: check for unique user - probably by email
    const newUser = await UserModel.create({
      userKey: newUserKey,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      confirmed: false,
    });

    return newUser;
  }

  async updateUser(userKey: string, email: string, options: updateUserOptions) {
    const { firstName, lastName, confirmed, password } = options;
    const updatedUser = await UserModel.update(
      { userKey, email },
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(confirmed && { confirmed }),
        ...(password && { password }),
      },
    );

    return updatedUser;
  }

  async getUser(userKey: string): Promise<UserOutput | null> {
    const results = await UserModel.query('userKey').eq(userKey).exec();
    const users = results.toJSON() as UserOutput[];
    return users.length > 0 ? users[0] : null;
  }

  async getUserByEmail(email: string): Promise<UserOutput | null> {
    const results = await UserModel.scan().where('email').eq(email).exec();
    const users = results.toJSON() as UserOutput[];
    return users.length > 0 ? users[0] : null;
  }

  async getUsers(): Promise<UserOutput[]> {
    const results = await UserModel.scan().exec();
    const users = results.toJSON() as UserOutput[];
    return users;
  }
}