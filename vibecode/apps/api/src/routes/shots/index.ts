import type { FastifyPluginAsync } from 'fastify';
import { ShotService } from '../../services/shot.service.js';
import { UploadService } from '../../services/upload.service.js';
import { TagService } from '../../services/tag.service.js';

interface CreateShotBody {
  prompt: string;
  imageUrl: string;
  imageKey: string;
  caption?: string;
  resultType?: 'image' | 'video' | 'link' | 'embed';
  embedHtml?: string;
  externalUrl?: string;
  challengeId?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

interface GetShotsQuery {
  cursor?: string;
  limit?: number;
}

interface DiscoveryQuery extends GetShotsQuery {
  sort?: 'recent' | 'popular';
}

interface ShotParams {
  id: string;
}

interface SubmitToChallengeBody {
  challengeId: string;
}

export const shotRoutes: FastifyPluginAsync = async (fastify) => {
  const shotService = new ShotService(fastify);
  const uploadService = new UploadService(fastify);
  const tagService = new TagService(fastify);

  // GET /shots - Chronological feed with cursor pagination (Explore tab)
  fastify.get<{ Querystring: DiscoveryQuery }>('/', {
    preHandler: [fastify.optionalAuth],
  }, async (request, _reply) => {
    const { cursor, limit = 20, sort = 'recent' } = request.query;
    const userId = request.user?.userId;

    const shots = await shotService.getDiscoveryFeed({
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
      sort,
    });

    return shots;
  });

  // GET /shots/following - Feed of shots from followed users
  fastify.get<{ Querystring: GetShotsQuery }>('/following', {
    preHandler: [fastify.authenticate],
  }, async (request, _reply) => {
    const { cursor, limit = 20 } = request.query;
    const { userId } = request.user;

    const shots = await shotService.getFollowingFeed({
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
    });

    return shots;
  });

  // GET /shots/:id - Get single shot
  fastify.get<{ Params: ShotParams }>('/:id', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user?.userId;

    const shot = await shotService.getById(id, userId);

    if (!shot) {
      return reply.status(404).send({ error: 'Shot not found' });
    }

    return shot;
  });

  // POST /shots - Create a new shot (no daily limit!)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.user;

    let prompt: string;
    let imageUrl: string;
    let imageKey: string;
    let caption: string | undefined;
    let resultType: 'image' | 'video' | 'link' | 'embed' = 'image';
    let embedHtml: string | undefined;
    let externalUrl: string | undefined;
    let challengeId: string | undefined;

    // Check if this is a multipart request
    const contentType = request.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart file upload
      try {
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({ error: 'No file uploaded' });
        }

        // Determine result type from file
        if (ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
          resultType = 'image';
        } else if (ALLOWED_VIDEO_TYPES.includes(data.mimetype)) {
          resultType = 'video';
        } else {
          return reply.status(400).send({
            error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM'
          });
        }

        // Get the file buffer
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Upload to S3
        const uploaded = await uploadService.uploadBuffer({
          userId,
          buffer,
          contentType: data.mimetype,
          fileName: data.filename,
        });

        imageUrl = uploaded.fileUrl;
        imageKey = uploaded.key;

        // Get fields from multipart
        const fields = data.fields;

        // Extract prompt (required)
        if (fields.prompt && typeof fields.prompt === 'object' && 'value' in fields.prompt) {
          prompt = (fields.prompt as { value: string }).value;
        } else {
          return reply.status(400).send({ error: 'Prompt is required' });
        }

        // Extract optional fields
        if (fields.caption && typeof fields.caption === 'object' && 'value' in fields.caption) {
          caption = (fields.caption as { value: string }).value;
        }
        if (fields.challengeId && typeof fields.challengeId === 'object' && 'value' in fields.challengeId) {
          challengeId = (fields.challengeId as { value: string }).value;
        }
      } catch (err) {
        const error = err as Error;
        fastify.log.error({
          message: error.message,
          name: error.name,
          stack: error.stack,
        }, 'Error processing file upload');
        return reply.status(500).send({ error: `Failed to process upload: ${error.message}` });
      }
    } else {
      // Handle JSON body (pre-uploaded to S3 or link/embed)
      const body = request.body as CreateShotBody;

      if (!body.prompt) {
        return reply.status(400).send({ error: 'Prompt is required' });
      }

      prompt = body.prompt;
      resultType = body.resultType || 'image';

      if (resultType === 'link') {
        if (!body.externalUrl) {
          return reply.status(400).send({ error: 'External URL is required for link result type' });
        }
        externalUrl = body.externalUrl;
        // For links, we might not have an uploaded image
        imageUrl = body.imageUrl || '';
        imageKey = body.imageKey || '';
      } else if (resultType === 'embed') {
        if (!body.embedHtml) {
          return reply.status(400).send({ error: 'Embed HTML is required for embed result type' });
        }
        embedHtml = body.embedHtml;
        imageUrl = body.imageUrl || '';
        imageKey = body.imageKey || '';
      } else {
        if (!body.imageUrl || !body.imageKey) {
          return reply.status(400).send({ error: 'Image URL and key are required' });
        }
        imageUrl = body.imageUrl;
        imageKey = body.imageKey;
      }

      caption = body.caption;
      challengeId = body.challengeId;
    }

    try {
      const shot = await shotService.create({
        userId,
        prompt: prompt.trim(),
        imageUrl,
        imageKey,
        caption: caption?.trim(),
        resultType,
        embedHtml,
        externalUrl,
        challengeId,
      });

      // Extract and attach hashtags from both prompt and caption
      const hashtags = [
        ...tagService.extractHashtags(prompt),
        ...tagService.extractHashtags(caption || ''),
      ];
      const uniqueHashtags = [...new Set(hashtags)];
      if (uniqueHashtags.length > 0) {
        await tagService.attachTagsToShot(shot.id, uniqueHashtags);
      }

      return reply.status(201).send(shot);
    } catch (err) {
      fastify.log.error({ err }, 'Error creating shot');
      return reply.status(500).send({ error: 'Failed to create shot' });
    }
  });

  // POST /shots/:id/challenge - Submit shot to a challenge
  fastify.post<{ Params: ShotParams; Body: SubmitToChallengeBody }>('/:id/challenge', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    const { challengeId } = request.body;
    const { userId } = request.user;

    if (!challengeId) {
      return reply.status(400).send({ error: 'Challenge ID is required' });
    }

    const success = await shotService.submitToChallenge(id, challengeId, userId);

    if (!success) {
      return reply.status(404).send({ error: 'Shot not found or not authorized' });
    }

    return { success: true };
  });

  // DELETE /shots/:id - Delete own shot
  fastify.delete<{ Params: ShotParams }>('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.user;

    const deleted = await shotService.delete(id, userId);

    if (!deleted) {
      return reply.status(404).send({ error: 'Shot not found or not authorized' });
    }

    return { success: true };
  });
};
