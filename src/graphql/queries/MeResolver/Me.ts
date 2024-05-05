import { Resolver, Query, Ctx } from 'type-graphql';

import { UserOutput } from '../../outputs/user';
import { CustomContext } from '../../types/CustomContext';
import { DBService } from '../../../database/DBService';
import Container, { Service } from 'typedi';

@Service()
@Resolver()
export class MeResolver {
  dbService: DBService;

  constructor() {
    this.dbService = Container.get(DBService);
  }

  @Query(() => UserOutput, { nullable: true })
  async me(@Ctx() ctx: CustomContext): Promise<UserOutput | undefined> {
    console.log('Me Resolver', ctx.req.userKey);
    if (!ctx.req.userKey) {
      return undefined;
    }
    const user = await this.dbService.getUser(ctx.req.userKey);

    return user ?? undefined;
  }
}
