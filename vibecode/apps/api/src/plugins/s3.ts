import fp from 'fastify-plugin';
import { S3Client } from '@aws-sdk/client-s3';
import type { FastifyPluginAsync, FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    s3: S3Client;
    s3Config: {
      bucket: string;
      region: string;
      endpoint?: string;
      publicUrl?: string; // Public URL for accessing files (R2.dev or custom domain)
    };
  }
}

const s3PluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const region = process.env.S3_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT; // For R2, MinIO, etc.

  // Support both AWS_* and S3_* naming conventions for credentials
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY;

  const hasCredentials = !!(accessKeyId && secretAccessKey);
  const bucket = process.env.S3_BUCKET || 'vibecode-uploads';
  const publicUrl = process.env.S3_PUBLIC_URL || process.env.CDN_URL || 'none';

  fastify.log.info(`S3 Config: hasCredentials=${hasCredentials}, bucket=${bucket}, region=${region}, endpoint=${endpoint || 'AWS S3'}, publicUrl=${publicUrl}, keyPrefix=${accessKeyId ? accessKeyId.substring(0, 8) : 'MISSING'}`);

  const s3Client = new S3Client({
    region,
    endpoint,
    forcePathStyle: !!endpoint, // Required for R2, MinIO, etc.
    credentials: accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined, // Use default credentials chain if not provided
  });

  const s3Config = {
    bucket: process.env.S3_BUCKET || 'vibecode-uploads',
    region,
    endpoint,
    // S3_PUBLIC_URL for R2.dev URL or custom domain, CDN_URL for CloudFront etc.
    publicUrl: process.env.S3_PUBLIC_URL || process.env.CDN_URL,
  };

  fastify.decorate('s3', s3Client);
  fastify.decorate('s3Config', s3Config);

  fastify.addHook('onClose', async () => {
    s3Client.destroy();
    fastify.log.info('S3 client closed');
  });
};

export const s3Plugin = fp(s3PluginAsync, {
  name: 's3-plugin',
});
