import { Module } from '@nestjs/common';
import { MarkService } from './mark.service';
import { MarkResolver } from './mark.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MarkService, MarkResolver],
})
export class MarkModule {}
