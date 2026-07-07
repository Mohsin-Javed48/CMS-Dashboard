import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { StudentService } from './student.service';
import { Student } from './model/student.model';
import { CreateStudentInput } from './dto/create-student.input';
import { UpdateStudentInput } from './dto/update-student.input';

@Resolver(() => Student)
export class StudentResolver {
  constructor(private readonly studentService: StudentService) {}

  @Mutation(() => Student)
  async createStudent(@Args('input') input: CreateStudentInput) {
    return this.studentService.create(input);
  }

  @Mutation(() => Student)
  async updateStudent(
    @Args('id') id: number,
    @Args('input') input: UpdateStudentInput,
  ) {
    return this.studentService.update(id, input);
  }

  @Mutation(() => Student)
  async deleteStudent(@Args('id') id: number) {
    return this.studentService.remove(id);
  }

  @Query(() => [Student])
  async getStudents() {
    return this.studentService.findAll();
  }

  @Query(() => Student)
  async getStudentById(@Args('id') id: number) {
    return this.studentService.findOne(id);
  }
}
