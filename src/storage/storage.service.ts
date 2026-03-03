import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
    private readonly s3Client: S3Client;
    private readonly logger = new Logger(StorageService.name);
    private bucketName: string;
    private publicUrl: string;

    constructor(private configService: ConfigService) {
        this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';
        this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: this.configService.get<string>('R2_ENDPOINT') || '',
            credentials: {
                accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID') || '',
                secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '',
            },
        });
    }

    async listVideos() {
        const command = new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: '',
        });

        try {
            const response = await this.s3Client.send(command);
            return (response.Contents || [])
                .filter((item) => item.Key?.endsWith('.mp4'))
                .map((item) => ({
                    filename: (item.Key as string).split('/').pop(),
                    key: item.Key,
                    lastModified: item.LastModified,
                    size: item.Size,
                }));
        } catch (error) {
            this.logger.error(`Error listing R2 videos: ${error.message}`);
            return [];
        }
    }

    async getSignedVideoUrl(key: string, expiresIn = 3600): Promise<string | null> {
        if (this.publicUrl) {
            return `${this.publicUrl}/${key}`;
        }

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ResponseCacheControl: 'public, max-age=86400',
        });

        try {
            return await getSignedUrl(this.s3Client, command, { expiresIn });
        } catch (error) {
            this.logger.error(`Error generating signed URL for ${key}: ${error.message}`);
            return null;
        }
    }

    async getObject(key: string, range?: string) {
        const params: any = {
            Bucket: this.bucketName,
            Key: key,
        };

        if (range) {
            params.Range = range;
        }

        return this.s3Client.send(new GetObjectCommand(params));
    }
}
