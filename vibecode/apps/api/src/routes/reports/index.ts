import type { FastifyPluginAsync } from 'fastify';
import { ReportService, type ReportReason, type ReportStatus, type ReportAction } from '../../services/report.service.js';
import { reportSchemas } from '../../schemas/report.schemas.js';

interface CreateReportBody {
  reportedUserId?: string;
  reportedShotId?: string;
  reportedCommentId?: string;
  reason: ReportReason;
  details?: string;
}

interface GetReportsQuery {
  status?: ReportStatus;
  cursor?: string;
  limit?: number;
}

interface ReportParams {
  id: string;
}

interface UpdateReportBody {
  status: ReportStatus;
  actionTaken?: ReportAction;
}

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  const reportService = new ReportService(fastify);

  // POST /reports - Submit a new report (auth required)
  fastify.post<{ Body: CreateReportBody }>('/', {
    preHandler: [fastify.authenticate],
    schema: reportSchemas.createReport,
  }, async (request, reply) => {
    const { userId } = request.user;
    const { reportedUserId, reportedShotId, reportedCommentId, reason, details } = request.body;

    // Validate at least one target
    if (!reportedUserId && !reportedShotId && !reportedCommentId) {
      return reply.status(400).send({ error: 'Report must specify a user, shot, or comment' });
    }

    // Validate reason for 'other' requires details
    if (reason === 'other' && (!details || details.trim().length === 0)) {
      return reply.status(400).send({ error: 'Please provide details for "other" reports' });
    }

    try {
      const report = await reportService.createReport({
        reporterId: userId,
        reportedUserId,
        reportedShotId,
        reportedCommentId,
        reason,
        details,
      });

      return reply.status(201).send({ report });
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot report yourself') {
        return reply.status(400).send({ error: error.message });
      }
      fastify.log.error({ error }, 'Failed to create report');
      return reply.status(500).send({ error: 'Failed to submit report' });
    }
  });

  // GET /reports - List reports (admin only)
  fastify.get<{ Querystring: GetReportsQuery }>('/', {
    preHandler: [fastify.authenticate],
    schema: reportSchemas.getReports,
  }, async (request, reply) => {
    const { userId } = request.user;
    const { status, cursor, limit = 20 } = request.query;

    // Check admin access
    const isAdmin = await reportService.isAdmin(userId);
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const result = await reportService.getReports(status, cursor, Math.min(limit, 50));

    return {
      reports: result.reports,
      nextCursor: result.nextCursor ?? null,
      hasMore: result.hasMore,
      total: result.total,
    };
  });

  // PATCH /reports/:id - Update report status (admin only)
  fastify.patch<{ Params: ReportParams; Body: UpdateReportBody }>('/:id', {
    preHandler: [fastify.authenticate],
    schema: reportSchemas.updateReport,
  }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params;
    const { status, actionTaken } = request.body;

    // Check admin access
    const isAdmin = await reportService.isAdmin(userId);
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const report = await reportService.updateReport(id, {
      status,
      actionTaken,
      reviewedBy: userId,
    });

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    return { report };
  });
};
