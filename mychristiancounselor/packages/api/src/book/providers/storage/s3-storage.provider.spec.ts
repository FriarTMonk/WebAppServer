import { Test } from '@nestjs/testing';
import { S3StorageProvider } from './s3-storage.provider';
import { S3Client } from '@aws-sdk/client-s3';

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;
  let s3Client: jest.Mocked<S3Client>;

  beforeEach(async () => {
    s3Client = {
      send: jest.fn(),
    } as any;

    provider = new S3StorageProvider(s3Client);
  });

  it('should upload to active tier with standard storage class', async () => {
    jest.spyOn(s3Client, 'send').mockResolvedValue({} as any);

    const key = 'test-book-id';
    const data = Buffer.from('test pdf content');

    await provider.upload(key, data, 'active');

    expect(s3Client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: expect.any(String),
          Key: expect.stringContaining('active/books/'),
          Body: data,
          StorageClass: 'STANDARD',
        }),
      })
    );
  });

  it('should upload to archived tier with glacier storage class', async () => {
    jest.spyOn(s3Client, 'send').mockResolvedValue({} as any);

    const key = 'test-book-id';
    const data = Buffer.from('test pdf content');

    await provider.upload(key, data, 'archived');

    expect(s3Client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          StorageClass: 'GLACIER',
        }),
      })
    );
  });

  it('should download from S3', async () => {
    const mockBody = Buffer.from('pdf content');
    jest.spyOn(s3Client, 'send').mockResolvedValue({
      Body: { transformToByteArray: async () => mockBody } as any,
    } as any);

    const result = await provider.download('test-book-id');

    expect(result).toEqual(mockBody);
  });

  it('should move file between tiers', async () => {
    jest.spyOn(s3Client, 'send').mockResolvedValue({} as any);

    await provider.move('test-book-id', 'archived', 'active');

    // Should copy to new location and delete from old
    expect(s3Client.send).toHaveBeenCalledTimes(2); // Copy + Delete
  });
});
