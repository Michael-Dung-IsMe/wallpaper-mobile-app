import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.R2_BUCKET_NAME || 'wallpaper-assets';

export const r2Client = new S3Client({
  region: 'auto',
  ...(process.env.R2_ENDPOINT ? { endpoint: process.env.R2_ENDPOINT } : {}),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload buffer to Cloudflare R2
 * @param key - The destination key (e.g. wallpapers/originals/abc.jpg)
 * @param buffer - File content as Buffer
 * @param contentType - MIME type (e.g. image/jpeg, image/webp)
 * @param bucket - Optional target bucket override
 */
export const uploadBuffer = async (
  key: string,
  buffer: Buffer,
  contentType: string,
  bucket: string = bucketName,
  cacheControl: string = 'public, max-age=31536000, immutable'
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  await r2Client.send(command);
  return key;
};

/**
 * Check whether an object exists in Cloudflare R2
 * @param key - The object key to check
 * @param bucket - Optional target bucket override
 */
export const checkObjectExists = async (
  key: string,
  bucket: string = bucketName
): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (
      error?.name === 'NotFound' ||
      error?.name === 'NoSuchKey' ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
};

/**
 * Delete an object from Cloudflare R2
 * @param key - The object key to delete
 * @param bucket - Optional target bucket override
 */
export const deleteObject = async (
  key: string,
  bucket: string = bucketName
): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await r2Client.send(command);
};

/**
 * Generate public URL for an R2 object key
 * @param key - The object key
 */
export const getPublicUrl = (key: string): string => {
  const rawBase = process.env.R2_PUBLIC_URL || '';
  const baseUrl = rawBase.startsWith('http://') || rawBase.startsWith('https://')
    ? rawBase
    : `https://${rawBase}`;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  return `${cleanBase}/${cleanKey}`;
};

/**
 * Generate a short-lived presigned URL for downloading an original image
 * @param key - The original object key in R2
 * @param expiresInSeconds - Expiration time in seconds (default 60s)
 */
export const getPresignedDownloadUrl = async (
  key: string,
  expiresInSeconds: number = 60,
  bucket: string = bucketName
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    // Optional: add response content disposition if you want it to trigger a download
    // ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"`
  });
  return await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
};

// Self-test block: executed when run directly (e.g. `npx tsx src/services/r2.service.ts`)
const currentScript = process.argv[1]?.replace(/\\/g, '/');
if (currentScript && (currentScript.endsWith('/r2.service.ts') || currentScript.endsWith('/r2.service.js'))) {
  (async () => {
    console.log('--- Kiểm tra kết nối Cloudflare R2 ---');
    console.log(`Endpoint:   ${process.env.R2_ENDPOINT}`);
    console.log(`Bucket:     ${bucketName}`);
    console.log(`Public URL: ${process.env.R2_PUBLIC_URL}`);

    const testKey = 'test/connection-check.txt';
    const testContent = `Cloudflare R2 connection test at ${new Date().toISOString()}`;
    const testBuffer = Buffer.from(testContent, 'utf-8');

    try {
      console.log(`\n[1/4] Đang tải file test lên R2: "${testKey}"...`);
      await uploadBuffer(testKey, testBuffer, 'text/plain');
      console.log('  -> Tải lên thành công!');

      console.log('\n[2/4] Kiểm tra sự tồn tại của object trên R2...');
      const exists = await checkObjectExists(testKey);
      console.log(`  -> Object tồn tại: ${exists}`);

      console.log('\n[3/4] Sinh đường dẫn công khai (Public URL)...');
      const publicUrl = getPublicUrl(testKey);
      console.log(`  -> Public URL: ${publicUrl}`);

      console.log('\n[4/4] Dọn dẹp object test khỏi R2...');
      await deleteObject(testKey);
      const existsAfter = await checkObjectExists(testKey);
      console.log(`  -> Đã xóa thành công (tồn tại: ${existsAfter})`);

      console.log('\n Kết nối Cloudflare R2 hoạt động hoàn hảo!');
    } catch (err) {
      console.error('\n Kiểm tra kết nối Cloudflare R2 thất bại:', err);
      process.exit(1);
    }
  })();
}
