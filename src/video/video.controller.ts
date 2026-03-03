import { Controller, Get, Param, Query, Res, HttpException, HttpStatus, Headers } from '@nestjs/common';
import { VideoService } from './video.service';
import { StorageService } from '../storage/storage.service';

@Controller()
export class VideoController {
    constructor(
        private readonly videoService: VideoService,
        private readonly storageService: StorageService,
    ) { }

    /** GET /api/videos?page=1&limit=20&series_title=... */
    @Get('api/videos')
    async getVideos(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('series_title') seriesTitle?: string,
    ) {
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '20', 10);
        return this.videoService.getPaginatedVideos(pageNum, limitNum, seriesTitle);
    }

    /** GET /api/series — list all series with video counts */
    @Get('api/series')
    async getSeries() {
        return this.videoService.getSeriesList();
    }

    /** GET /api/series/:title — all episodes for a specific series */
    @Get('api/series/:title')
    async getSeriesDetails(@Param('title') title: string) {
        const decoded = decodeURIComponent(title);
        const episodes = await this.videoService.getSeriesVideos(decoded);
        if (!episodes || episodes.length === 0) {
            throw new HttpException('Series not found', HttpStatus.NOT_FOUND);
        }
        return episodes;
    }

    /** GET /api/search?q=query — search videos and series */
    @Get('api/search')
    async searchVideos(@Query('q') query?: string) {
        if (!query || query.trim().length === 0) {
            return { videos: [], series: [] };
        }
        return this.videoService.searchVideos(query.trim());
    }

    /** GET /api/app_config — app version + admin config stub */
    @Get('api/app_config')
    getAppConfig() {
        return {
            app_version: {
                latest: '1.0.5',
                minimum: '1.0.0',
                force_update: false,
            },
            update_dialog: {
                enabled: false,
                title: '',
                message: '',
                update_url: '',
            },
            notifications: [],
            maintenance: {
                enabled: false,
                message: '',
            },
        };
    }

    /** GET /video/:filename — stream video from R2 with range support */
    @Get('video/:filename')
    async streamVideo(
        @Param('filename') filename: string,
        @Headers('range') range: string,
        @Res() res: any,
    ) {
        const videoFile = await this.videoService.findByFilename(filename);

        if (!videoFile) {
            throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        }

        try {
            const response = await this.storageService.getObject(videoFile.key, range);
            const contentLength = response.ContentLength;

            if (contentLength === undefined) {
                throw new HttpException('Invalid content length', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            res.setHeader('x-no-compression', '1');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Type', 'video/mp4');

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
                const chunksize = end - start + 1;

                res.status(HttpStatus.PARTIAL_CONTENT);
                res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
                res.setHeader('Content-Length', chunksize);
            } else {
                res.status(HttpStatus.OK);
                res.setHeader('Content-Length', contentLength);
            }

            // AWS SDK v3 streams body
            (response.Body as any).pipe(res);
        } catch (error) {
            throw new HttpException('Error streaming video', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
