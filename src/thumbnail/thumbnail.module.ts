import { Module } from '@nestjs/common';
import { ThumbnailProcessor } from './thumbnail.processor';
import { ThumbnailController } from './thumbnail.controller';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    StorageModule,
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  providers: [ThumbnailProcessor],
  controllers: [ThumbnailController],
})
export class ThumbnailModule { }
