import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { Course } from '../../course/model/course.model';

@ObjectType()
export class Student {
  @Field(() => ID)
  id!: number;

  @Field(() => Int)
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

  @Field(() => Float, { nullable: true })
  cgpa?: number;

  @Field(() => [Course])
  courses!: Course[];
}
