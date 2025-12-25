import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { IStorageProvider } from '@mychristiancounselor/shared';
import { resourcesConfig } from '../../../config/resources.config';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;

  constructor(s3Client?: S3Client) {
    this.s3Client = s3Client || new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async upload(key: string, data: Buffer, tier: 'active' | 'archived'): Promise<string> {
    const config = tier === 'active'
      ? resourcesConfig.storage.activeTier
      : resourcesConfig.storage.archivedTier;

    const fullKey = `${config.prefix}${key}.pdf`;
    const storageClass = tier === 'active' ? 'STANDARD' : 'GLACIER';

    this.logger.log(`Uploading ${fullKey} to ${tier} tier (${storageClass})`);

    await this.s3Client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: fullKey,
      Body: data,
      StorageClass: storageClass,
      ContentType: 'application/pdf',
    }));

    return fullKey;
  }

  async download(key: string): Promise<Buffer> {
    // Try active tier first, then archived
    const tiers = [
      resourcesConfig.storage.activeTier,
      resourcesConfig.storage.archivedTier,
    ];

    for (const tierConfig of tiers) {
      try {
        const fullKey = `${tierConfig.prefix}${key}.pdf`;
        this.logger.log(`Attempting download from ${fullKey}`);

        const response = await this.s3Client.send(new GetObjectCommand({
          Bucket: tierConfig.bucket,
          Key: fullKey,
        }));

        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
      } catch (error) {
        // Try next tier if not found
        continue;
      }
    }

    throw new Error(`File not found: ${key}`);
  }

  async move(key: string, fromTier: 'active' | 'archived', toTier: 'active' | 'archived'): Promise<void> {
    const fromConfig = fromTier === 'active'
      ? resourcesConfig.storage.activeTier
      : resourcesConfig.storage.archivedTier;

    const toConfig = toTier === 'active'
      ? resourcesConfig.storage.activeTier
      : resourcesConfig.storage.archivedTier;

    const fromKey = `${fromConfig.prefix}${key}.pdf`;
    const toKey = `${toConfig.prefix}${key}.pdf`;
    const toStorageClass = toTier === 'active' ? 'STANDARD' : 'GLACIER';

    this.logger.log(`Moving ${fromKey} to ${toKey} (${toStorageClass})`);

    // Copy to new location
    await this.s3Client.send(new CopyObjectCommand({
      Bucket: toConfig.bucket,
      CopySource: `${fromConfig.bucket}/${fromKey}`,
      Key: toKey,
      StorageClass: toStorageClass,
    }));

    // Delete from old location
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: fromConfig.bucket,
      Key: fromKey,
    }));
  }

  async delete(key: string): Promise<void> {
    // Try to delete from both tiers
    const tiers = [
      resourcesConfig.storage.activeTier,
      resourcesConfig.storage.archivedTier,
    ];

    for (const tierConfig of tiers) {
      try {
        const fullKey = `${tierConfig.prefix}${key}.pdf`;
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: tierConfig.bucket,
          Key: fullKey,
        }));
        this.logger.log(`Deleted ${fullKey}`);
      } catch (error) {
        // Ignore if not found
      }
    }
  }
}
