import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { extractTitleAndEpisode } from '../utils/fileParser';

@Injectable()
export class VideoService {
    private readonly logger = new Logger(VideoService.name);

    constructor(
        private prisma: PrismaService,
        private storageService: StorageService,
    ) { }

    async getPaginatedVideos(page = 1, limit = 20, seriesTitle?: string) {
        const skip = (page - 1) * limit;

        const where = seriesTitle
            ? { series: { title: seriesTitle } }
            : {};

        const [total, videos] = await Promise.all([
            this.prisma.video.count({ where }),
            this.prisma.video.findMany({
                where,
                skip,
                take: limit,
                orderBy: seriesTitle ? { episodeNumber: 'asc' } : { lastModified: 'desc' },
                include: { series: true },
            }),
        ]);

        // Hydrate URLs
        const hydratedVideos = await Promise.all(
            videos.map(async (v) => {
                const url = await this.storageService.getSignedVideoUrl(v.key);
                return {
                    ...v,
                    url,
                    size: v.size.toString(),
                };
            }),
        );

        return {
            data: hydratedVideos,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit,
            },
        };
    }

    async getSeriesList() {
        return this.prisma.series.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { videos: true },
                },
            },
        });
    }

    async findByFilename(filename: string) {
        return this.prisma.video.findUnique({
            where: { filename },
        });
    }
}
