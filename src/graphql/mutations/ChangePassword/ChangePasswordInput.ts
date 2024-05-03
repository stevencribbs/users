import { Field, InputType } from 'type-graphql';
import { PasswordInput } from '../../inputs/passwordInput';

@InputType()
export class ChangePasswordInput extends PasswordInput {
  @Field()
  token: string;
}
