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
    });
  }

  async findAll() {
    return this.prisma.mark.findMany();
  }

  async findOne(id: number) {
    return this.prisma.mark.findUnique({
      where: { id },
    });
  }

  async updateMark(id: number, input: UpdateMarkInput) {
    return this.prisma.mark.update({
      where: { id },
      data: input,
    });
  }

  async deleteMark(id: number) {
    return this.prisma.mark.delete({
      where: { id },
    });
  }
}
