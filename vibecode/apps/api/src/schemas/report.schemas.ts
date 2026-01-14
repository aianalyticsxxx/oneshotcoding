const reasonEnum = ['spam', 'harassment', 'inappropriate', 'impersonation', 'other'];
const statusEnum = ['pending', 'reviewed', 'actioned', 'dismissed'];
const actionEnum = ['none', 'warning', 'content_removed', 'user_banned'];

const reportResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    reporterId: { type: 'string', format: 'uuid' },
    reportedUserId: { type: 'string', format: 'uuid', nullable: true },
    reportedShotId: { type: 'string', format: 'uuid', nullable: true },
    reportedCommentId: { type: 'string', format: 'uuid', nullable: true },
    reason: { type: 'string', enum: reasonEnum },
    details: { type: 'string', nullable: true },
    status: { type: 'string', enum: statusEnum },
    reviewedBy: { type: 'string', format: 'uuid', nullable: true },
    reviewedAt: { type: 'string', format: 'date-time', nullable: true },
    actionTaken: { type: 'string', enum: actionEnum, nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    reporter: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid' },
        username: { type: 'string' },
        displayName: { type: 'string' },
      },
    },
  },
};

export const reportSchemas = {
  createReport: {
    body: {
      type: 'object',
      required: ['reason'],
      properties: {
        reportedUserId: { type: 'string', format: 'uuid' },
        reportedShotId: { type: 'string', format: 'uuid' },
        reportedCommentId: { type: 'string', format: 'uuid' },
        reason: { type: 'string', enum: reasonEnum },
        details: { type: 'string', maxLength: 1000 },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          report: reportResponseSchema,
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },

  getReports: {
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: statusEnum },
        cursor: { type: 'string', format: 'date-time' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          reports: {
            type: 'array',
            items: reportResponseSchema,
          },
          nextCursor: { type: 'string', nullable: true },
          hasMore: { type: 'boolean' },
          total: { type: 'integer' },
        },
      },
      403: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },

  updateReport: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
    },
    body: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: statusEnum },
        actionTaken: { type: 'string', enum: actionEnum },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          report: reportResponseSchema,
        },
      },
      403: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
};
