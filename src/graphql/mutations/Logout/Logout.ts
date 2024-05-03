import { Resolver, Mutation, Ctx } from 'type-graphql';
import { CustomContext } from '../../types/CustomContext';
import { Service } from 'typedi';

@Service()
@Resolver()
export class LogoutMutation {
  @Mutation(() => Boolean)
  async logout(@Ctx() ctx: CustomContext): Promise<Boolean> {
    console.log('Logout');
    return new Promise((res, rej) =>
      ctx.req.session!.destroy((err) => {
        if (err) {
          console.log(err);
          return rej(false);
        }

        ctx.res.clearCookie('qid');
        return res(true);
      }),
    );
  }
}
