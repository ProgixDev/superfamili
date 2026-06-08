import { Module } from '@nestjs/common';
import { EducatorsController } from './educators.controller';
import { EducatorsService } from './educators.service';
import { EducatorsSearchService } from './educators-search.service';

@Module({
  controllers: [EducatorsController],
  providers: [EducatorsService, EducatorsSearchService],
  exports: [EducatorsService, EducatorsSearchService],
})
export class EducatorsModule {}
