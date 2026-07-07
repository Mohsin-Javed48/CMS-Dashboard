import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateCourseInput {
  @Field()
  courseCode!: string;

  @Field()
  courseName!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  credits!: number;

  @Field({ nullable: true })
  schedule?: string;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field(() => [Int], { nullable: true })
  enrolledStudents?: number[];
}
