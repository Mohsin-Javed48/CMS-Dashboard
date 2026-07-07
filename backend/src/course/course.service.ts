import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseInput } from './dto/create-course.input';

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  // Get all courses
  async findAll() {
    // return this.prisma.course.findMany();
    return {
      message:
        'This is a placeholder response. Implement the findAll method to return actual courses from the database.',
    };
  }

  // Get single course
  async findOne(id: number) {
    return this.prisma.course.findUnique({
      where: { id },
    });
  }

  // Create course
  async createCourse(input: CreateCourseInput) {
    const { enrolledStudents, ...courseData } = input;
    return this.prisma.course.create({
      data: {
        ...courseData,
        enrolledStudents: enrolledStudents
          ? { connect: enrolledStudents.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  // Update course
  async updateCourse(id: number, data: any) {
    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  // Delete course
  async deleteCourse(id: number) {
    return this.prisma.course.delete({
      where: { id },
    });
  }
}
