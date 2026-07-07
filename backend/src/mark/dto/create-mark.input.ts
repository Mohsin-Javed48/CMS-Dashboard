import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateMarkInput {
  @Field()
  studentId!: string;

  @Field()
  courseId!: number;

  @Field()
  marksObtained!: number;

  @Field()
  grade!: string;

  @Field()
  isActive!: boolean;
}
