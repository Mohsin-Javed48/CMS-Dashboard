import { Module } from '@nestjs/common';
import { MarkService } from './mark.service';
import { MarkResolver } from './mark.resolver';

@Module({
  providers: [MarkService, MarkResolver],
})
export class MarkModule {}
