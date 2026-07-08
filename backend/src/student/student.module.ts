import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentService } from './student.service';
import { StudentResolver } from './student.resolver';

@Module({
  imports: [PrismaModule],
  providers: [StudentService, StudentResolver],
})
export class StudentModule {}
