import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { VideoModule } from './video/video.module';
import { ChatModule } from './chat/chat.module';
import { ThumbnailModule } from './thumbnail/thumbnail.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    StorageModule,
    VideoModule,
    ChatModule,
    ThumbnailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
