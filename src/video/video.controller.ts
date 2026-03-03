import { Controller, Get, Param, Query, Res, HttpException, HttpStatus, Headers } from '@nestjs/common';
import { VideoService } from './video.service';
import { StorageService } from '../storage/storage.service';

@Controller()
export class VideoController {
    constructor(
        private readonly videoService: VideoService,
        private readonly storageService: StorageService,
    ) { }

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

    @Get('api/series')
    async getSeries() {
        return this.videoService.getSeriesList();
    }

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
