import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { CreateMarkInput } from './create-mark.input';

@InputType()
export class UpdateMarkInput extends PartialType(CreateMarkInput) {
  @Field(() => Int)
  id!: number;
}
