import type { FastifyPluginAsync } from 'fastify';
import { UploadService } from '../../services/upload.service.js';
import { uploadSchemas } from '../../schemas/upload.schemas.js';

interface PresignedUrlBody {
  fileName: string;
  contentType: string;
  fileSize: number;
}

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  const uploadService = new UploadService(fastify);

  // POST /upload/presigned - Generate S3 presigned URL
  fastify.post<{ Body: PresignedUrlBody }>('/presigned', {
    preHandler: [fastify.authenticate],
    schema: uploadSchemas.getPresignedUrl,
  }, async (request, reply) => {
    const { userId } = request.user;
    const { fileName, contentType, fileSize } = request.body;

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return reply.status(400).send({
        error: 'Invalid content type',
        allowedTypes: ALLOWED_CONTENT_TYPES,
      });
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return reply.status(400).send({
        error: 'File too large',
        maxSize: MAX_FILE_SIZE,
      });
    }

    try {
      const result = await uploadService.generatePresignedUrl({
        userId,
        fileName,
        contentType,
      });

      return result;
    } catch (err) {
      fastify.log.error({ err }, 'Error generating presigned URL');
      return reply.status(500).send({ error: 'Failed to generate upload URL' });
    }
  });
};
