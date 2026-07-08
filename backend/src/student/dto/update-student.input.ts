import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { IsInt } from 'class-validator';
import { CreateStudentInput } from './create-student.input';

@InputType()
export class UpdateStudentInput extends PartialType(CreateStudentInput) {
  @Field(() => ID)
  @IsInt()
  id!: number;
}
