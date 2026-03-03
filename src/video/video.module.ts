import { Module } from '@nestjs/common';
import { VideoService } from './video.service';

import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { VideoController } from './video.controller';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [VideoService],
  controllers: [VideoController],
})
export class VideoModule { }
