import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import Container, { Service } from 'typedi';
import { DBService } from '../../../database/DBService';
import { CustomContext } from '../../types/CustomContext';

@Service()
@Resolver()
export class InvalidateTokensMutation {
  dbService: DBService;

  constructor() {
    this.dbService = Container.get(DBService);
  }

  @Mutation(() => Boolean, { nullable: true })
  async invalidateTokens(@Ctx() ctx: CustomContext): Promise<Boolean> {
    console.log('invalidate tokens');
    if (!ctx.req.userKey) {
      return false;
    }

    const user = await this.dbService.getUser(ctx.req.userKey);

    if (!user) {
      return false;
    }
    const newCount = (user.refreshTokenCount += 1);
    const userKey = user.userKey;
    const email = user.email;
    await this.dbService.updateUser(userKey, email, {
      refreshTokenCount: newCount,
    });

    return true;
  }
}
