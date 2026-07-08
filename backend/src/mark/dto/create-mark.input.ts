import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsInt, IsString } from 'class-validator';

@InputType()
export class CreateMarkInput {
  @Field()
  @IsString()
  studentId!: string;

  @Field()
  @IsInt()
  courseId!: number;

  @Field()
  @IsInt()
  marksObtained!: number;

  @Field()
  @IsString()
  grade!: string;

  @Field()
  @IsBoolean()
  isActive!: boolean;
}
