import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/thumbnails')
export class ThumbnailController {
    constructor(private readonly prisma: PrismaService) { }

    @Post('generate')
    async generateThumbnail(@Body() body: { videoKey: string; filename: string }) {
        const job = await this.prisma.job.create({
            data: {
                type: 'extract-thumbnail',
                payload: JSON.stringify(body),
                status: 'pending',
            },
        });
        return { status: 'job added to database queue', jobId: job.id, file: body.filename };
    }
}
