import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

@InputType()
export class CreateStudentInput {
  @Field()
  @IsInt()
  studentId!: number;

  @Field()
  @IsString()
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field()
  @IsString()
  cnic!: string;

  @Field()
  @IsString()
  phone!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  cgpa?: number;

  @Field(() => [Number], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  courses?: number[];
}
