import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateMarkInput } from './dto/create-mark.input';
import { UpdateMarkInput } from './dto/update-mark.input';

@Injectable()
export class MarkService {
  constructor(private prisma: PrismaService) {}

  async createMark(input: CreateMarkInput) {
    return this.prisma.mark.create({
      data: input,
      include: { course: true },
    });
  }

  async findAll() {
    return this.prisma.mark.findMany({
      include: { course: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.mark.findUnique({
      where: { id },
      include: { course: true },
    });
  }

  async updateMark(id: number, input: UpdateMarkInput) {
    return this.prisma.mark.update({
      where: { id },
      data: input,
      include: { course: true },
    });
  }

  async deleteMark(id: number) {
    return this.prisma.mark.delete({
      where: { id },
      include: { course: true },
    });
  }
}
