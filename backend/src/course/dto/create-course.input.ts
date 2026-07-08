import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

@InputType()
export class CreateCourseInput {
  @Field()
  @IsString()
  courseCode!: string;

  @Field()
  @IsString()
  courseName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsInt()
  credits!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  schedule?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => [Int], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  enrolledStudents?: number[];
}
