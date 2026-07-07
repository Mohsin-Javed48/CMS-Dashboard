import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Course } from '../../course/model/course.model';

@ObjectType()
export class Mark {
  @Field(() => ID)
  id!: number;

  @Field()
  studentId!: string;

  @Field(() => Int)
  courseId!: number;

  @Field(() => Int)
  marksObtained!: number;

  @Field()
  grade!: string;

  @Field()
  isActive!: boolean;
}
