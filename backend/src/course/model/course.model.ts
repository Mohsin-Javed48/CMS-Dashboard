import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Student } from '../../student/model/student.model';

@ObjectType()
export class Course {
  @Field(() => ID)
  id!: number;

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

  @Field()
  isActive!: boolean;

  @Field(() => [Student])
  enrolledStudents!: Student[];
}
