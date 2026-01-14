import type { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../../services/auth.service.js';

export const accountsRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify);

  // GET /auth/accounts - List linked OAuth accounts
  fastify.get('/accounts', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const accounts = await authService.getUserOAuthAccounts(request.user.userId);
    return { accounts };
  });

  // DELETE /auth/accounts/:provider - Unlink an OAuth account
  fastify.delete<{ Params: { provider: string } }>('/accounts/:provider', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: ['github', 'twitter'] },
        },
      },
    },
  }, async (request, reply) => {
    const { provider } = request.params;

    const success = await authService.unlinkOAuthAccount(
      request.user.userId,
      provider as 'github' | 'twitter'
    );

    if (!success) {
      return reply.status(400).send({
        error: 'Cannot unlink your only authentication method',
      });
    }

    return { success: true };
  });
};
