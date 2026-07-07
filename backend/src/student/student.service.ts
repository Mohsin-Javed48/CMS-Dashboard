import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateStudentInput } from './dto/create-student.input';
import { UpdateStudentInput } from './dto/update-student.input';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStudentInput: CreateStudentInput) {
    return this.prisma.student.create({
      data: {
        ...createStudentInput,
        courses: {
          connect:
            createStudentInput.courses?.map((courseId) => ({ id: courseId })) ||
            [],
        },
      },
    });
  }

  async findAll() {
    return this.prisma.student.findMany({
      include: {
        courses: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        courses: true,
      },
    });
  }

  async update(id: number, updateStudentInput: UpdateStudentInput) {
    return this.prisma.student.update({
      where: { id },
      data: {
        ...updateStudentInput,
        courses: {
          connect:
            updateStudentInput.courses?.map((courseId) => ({ id: courseId })) ||
            [],
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.student.delete({
      where: { id },
    });
  }
}
