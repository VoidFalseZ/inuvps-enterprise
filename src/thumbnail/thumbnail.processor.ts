import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { getBaseFilename } from '../utils/fileParser';

// Resolve binary paths correctly depending on environment
let ffmpegPath: string;
let ffprobePath: string;
try {
    ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffprobePath = require('@ffprobe-installer/ffprobe').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
} catch (e) {
    Logger.warn('FFmpeg package missing, relying on system PATH');
}

export const THUMBNAIL_DIR = path.join(process.cwd(), 'cache', 'thumbnails');

@Injectable()
export class ThumbnailProcessor {
    private readonly logger = new Logger(ThumbnailProcessor.name);
    private isProcessing = false;

    constructor(
        private storageService: StorageService,
        private prisma: PrismaService,
    ) {
        if (!fs.existsSync(THUMBNAIL_DIR)) {
            fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
        }
    }

    @Cron('*/10 * * * * *') // Check for new jobs every 10 seconds
    async processQueue() {
        if (this.isProcessing) return; // Prevent concurrent overlapping checks

        const job = await this.prisma.job.findFirst({
            where: { status: 'pending', type: 'extract-thumbnail' },
            orderBy: { createdAt: 'asc' },
        });

        if (!job) return;

        this.isProcessing = true;

        try {
            await this.prisma.job.update({ where: { id: job.id }, data: { status: 'processing' } });

            const payload = JSON.parse(job.payload);
            const { videoKey, filename } = payload;

            const baseFilename = getBaseFilename(filename);
            const outputFilename = `${baseFilename}.png`;
            const outputPath = path.join(THUMBNAIL_DIR, outputFilename);

            if (fs.existsSync(outputPath)) {
                this.logger.log(`Thumbnail already exists for ${filename}`);
                await this.prisma.job.update({ where: { id: job.id }, data: { status: 'completed' } });
                this.isProcessing = false;
                return;
            }

            this.logger.log(`Generating thumbnail for ${filename}...`);
            const videoUrl = await this.storageService.getSignedVideoUrl(videoKey, 3600);

            if (!videoUrl) {
                throw new Error(`Could not generate signed URL for ${videoKey}`);
            }

            await new Promise((resolve, reject) => {
                ffmpeg(videoUrl)
                    .inputOptions(['-ss 30', '-t 1'])
                    .outputOptions(['-vframes 1', '-q:v 2', '-vf scale=320:180'])
                    .output(outputPath)
                    .on('end', () => {
                        this.logger.log(`Thumbnail generated successfully: ${outputFilename}`);
                        resolve(`/thumbnails/${outputFilename}`);
                    })
                    .on('error', (err) => {
                        this.logger.error(`Thumbnail generation failed for ${outputFilename}: ${err.message}`);
                        reject(err);
                    })
                    .run();
            });

            await this.prisma.job.update({ where: { id: job.id }, data: { status: 'completed' } });
        } catch (error) {
            this.logger.error(`Failed to process job ${job.id}:`, error);
            await this.prisma.job.update({
                where: { id: job.id },
                data: { status: 'failed', error: String(error) }
            });
        } finally {
            this.isProcessing = false;
        }
    }
}
