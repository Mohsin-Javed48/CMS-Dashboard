import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CourseService } from './course.service';
import { Course } from './model/course.model';
import { CreateCourseInput } from './dto/create-course.input';

@Resolver(() => Course)
export class CourseResolver {
  constructor(private courseService: CourseService) {}

  @Query(() => [Course])
  getCourses() {
    return this.courseService.findAll();
  }

  @Query(() => Course)
  createCourse(@Args('input') input: CreateCourseInput) {
    return this.courseService.createCourse(input);
  }

  @Query(() => Course, { nullable: true })
  getCourse(@Args('id', { type: () => Int }) id: number) {
    return this.courseService.findOne(id);
  }

  @Mutation(() => Course)
  deleteCourse(@Args('id', { type: () => Int }) id: number) {
    return this.courseService.deleteCourse(id);
  }
}
