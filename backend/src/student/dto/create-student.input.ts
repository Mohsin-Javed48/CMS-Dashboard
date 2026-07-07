import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateStudentInput {
  @Field()
  studentId!: number;

  @Field()
  name!: string;

  @Field({ nullable: true })
  fatherName?: string;

  @Field()
  email!: string;

  @Field({ nullable: true })
  address?: string;

  @Field()
  cnic!: string;

  @Field()
  phone!: string;

  @Field({ nullable: true })
  cgpa?: number;

  @Field(() => [Number], { nullable: true })
  courses?: number[];
}
