import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideoService {
    private readonly logger = new Logger(VideoService.name);

    constructor(
        private prisma: PrismaService,
        private storageService: StorageService,
    ) { }

    // ─── DTO Mappers ──────────────────────────────────────────────────────────

    /**
     * Maps a Prisma Series object → snake_case DTO expected by the React Native frontend.
     */
    private toSeriesDto(s: any) {
        return {
            series_title: s.title,
            thumbnail_url: s.thumbnailUrl || null,
            description: s.description || null,
            video_count: s._count?.videos ?? 0,
            created_at: s.createdAt,
            updated_at: s.updatedAt,
        };
    }

    /**
     * Maps a Prisma Video object → snake_case DTO expected by the React Native frontend.
     * `url` should be pre-hydrated before calling this mapper.
     */
    private toVideoDto(v: any, hydratedUrl: string | null) {
        const episodeNum = v.episodeNumber ?? null;
        const displayTitle = v.title
            ?? (episodeNum !== null ? `EP ${episodeNum}` : v.filename);

        return {
            filename: v.filename,
            series_title: v.series?.title ?? null,
            episode_number: episodeNum,
            title: v.title ?? null,
            display_title: displayTitle,
            description: v.description ?? null,
            thumbnail_url: v.thumbnailUrl ?? v.series?.thumbnailUrl ?? null,
            url: hydratedUrl,
            size: v.size?.toString() ?? '0',
            modified_at: v.lastModified,
            created_at: v.createdAt,
            updated_at: v.updatedAt,
        };
    }

    // ─── Query Methods ────────────────────────────────────────────────────────

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

        const hydratedVideos = await Promise.all(
            videos.map(async (v) => {
                const url = await this.storageService.getSignedVideoUrl(v.key);
                return this.toVideoDto(v, url);
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
        const seriesList = await this.prisma.series.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { videos: true },
                },
            },
        });
        return seriesList.map((s) => this.toSeriesDto(s));
    }

    /**
     * Get all episodes for a specific series, ordered by episode number.
     * Used by GET /api/series/:title
     */
    async getSeriesVideos(seriesTitle: string) {
        const videos = await this.prisma.video.findMany({
            where: { series: { title: seriesTitle } },
            orderBy: { episodeNumber: 'asc' },
            include: { series: true },
        });

        return Promise.all(
            videos.map(async (v) => {
                const url = await this.storageService.getSignedVideoUrl(v.key);
                return this.toVideoDto(v, url);
            }),
        );
    }

    /**
     * Search videos and series by query string.
     * Used by GET /api/search?q=
     */
    async searchVideos(query: string) {
        // mode: 'insensitive' is a PostgreSQL feature; cast to any for dev SQLite compat
        const searchWhere = (field: any) => ({ contains: query, mode: 'insensitive' as any, ...field });
        const [videos, seriesList] = await Promise.all([
            this.prisma.video.findMany({
                where: {
                    OR: [
                        { filename: { contains: query, mode: 'insensitive' as any } },
                        { title: { contains: query, mode: 'insensitive' as any } },
                        { series: { title: { contains: query, mode: 'insensitive' as any } } },
                    ],
                } as any,
                orderBy: { lastModified: 'desc' },
                take: 50,
                include: { series: true },
            }),
            this.prisma.series.findMany({
                where: { title: { contains: query, mode: 'insensitive' as any } } as any,
                include: { _count: { select: { videos: true } } },
                take: 20,
            }),
        ]);

        const hydratedVideos = await Promise.all(
            videos.map(async (v) => {
                const url = await this.storageService.getSignedVideoUrl(v.key);
                return this.toVideoDto(v, url);
            }),
        );

        return {
            videos: hydratedVideos,
            series: seriesList.map((s) => this.toSeriesDto(s)),
        };
    }

    async findByFilename(filename: string) {
        return this.prisma.video.findUnique({
            where: { filename },
        });
    }
}
