import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';
import { CreateMarkInput } from './create-mark.input';

@InputType()
export class UpdateMarkInput extends PartialType(CreateMarkInput) {
  @Field(() => Int)
  @IsInt()
  id!: number;
}
