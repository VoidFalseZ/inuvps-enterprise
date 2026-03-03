import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { StorageService } from './storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const storage = app.get(StorageService);

    console.log('--- Starting Data Migration ---');

    // 1. Load legacy metadata
    const cachePath = path.join(process.cwd(), '..', 'inuvps', 'cache', 'metadata.json');
    let metadata: Record<string, any> = {};
    if (fs.existsSync(cachePath)) {
        metadata = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        console.log(`Loaded ${Object.keys(metadata).length} metadata entries from legacy cache.`);
    } else {
        console.log('Warning: No legacy metadata.json found.');
    }

    // 2. Fetch current videos from R2
    console.log('Fetching video list from R2...');
    const r2Videos = await storage.listVideos();
    console.log(`Found ${r2Videos.length} videos in R2 bucket.`);

    // 3. Migrate data
    for (const video of r2Videos) {
        const filename: string = video.filename || '';
        const meta = filename ? (metadata[filename] || {}) : {};
        const seriesTitle = meta.series_title || 'Uncategorized';

        // Upsert Series
        const series = await prisma.series.upsert({
            where: { title: seriesTitle },
            update: {},
            create: {
                title: seriesTitle,
                description: meta.description || null,
                // we'd add thumbnail extraction later here
            },
        });

        // Upsert Video
        await prisma.video.upsert({
            where: { filename: video.filename },
            update: {
                lastModified: video.lastModified ? new Date(video.lastModified) : new Date(),
                size: video.size ? BigInt(video.size) : BigInt(0),
            },
            create: {
                filename: filename,
                key: video.key || '',
                seriesId: series.id,
                episodeNumber: meta.episode_number || null,
                title: meta.display_title || filename,
                description: meta.description || null,
                lastModified: video.lastModified ? new Date(video.lastModified) : new Date(),
                size: video.size ? BigInt(video.size) : BigInt(0),
            },
        });
        console.log(`Migrated: ${video.filename}`);
    }

    console.log('--- Migration Complete ---');
    await app.close();
}

bootstrap();
