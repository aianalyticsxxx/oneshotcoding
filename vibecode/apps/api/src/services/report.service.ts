import type { FastifyInstance } from 'fastify';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type ReportAction = 'none' | 'warning' | 'content_removed' | 'user_banned';

interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedShotId?: string;
  reportedCommentId?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  actionTaken?: ReportAction;
  createdAt: Date;
  reporter?: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface CreateReportData {
  reporterId: string;
  reportedUserId?: string;
  reportedShotId?: string;
  reportedCommentId?: string;
  reason: ReportReason;
  details?: string;
}

interface UpdateReportData {
  status: ReportStatus;
  actionTaken?: ReportAction;
  reviewedBy: string;
}

interface ReportListResult {
  reports: Report[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

export class ReportService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Create a new report
   */
  async createReport(data: CreateReportData): Promise<Report> {
    // Validate that at least one target is specified
    if (!data.reportedUserId && !data.reportedShotId && !data.reportedCommentId) {
      throw new Error('Report must have at least one target');
    }

    // Prevent self-reporting
    if (data.reportedUserId === data.reporterId) {
      throw new Error('Cannot report yourself');
    }

    const result = await this.fastify.db.query(
      `INSERT INTO reports (
        reporter_id,
        reported_user_id,
        reported_shot_id,
        reported_comment_id,
        reason,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at, status`,
      [
        data.reporterId,
        data.reportedUserId || null,
        data.reportedShotId || null,
        data.reportedCommentId || null,
        data.reason,
        data.details?.trim() || null,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      reporterId: data.reporterId,
      reportedUserId: data.reportedUserId,
      reportedShotId: data.reportedShotId,
      reportedCommentId: data.reportedCommentId,
      reason: data.reason,
      details: data.details,
      status: row.status,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Get reports with pagination (admin only)
   */
  async getReports(
    status?: ReportStatus,
    cursor?: string,
    limit: number = 20
  ): Promise<ReportListResult> {
    const params: (string | number)[] = [limit + 1];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (cursor) {
      params.push(cursor);
      conditions.push(`r.created_at < $${params.length}`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await this.fastify.db.query(
      `SELECT
        r.id,
        r.reporter_id,
        r.reported_user_id,
        r.reported_shot_id,
        r.reported_comment_id,
        r.reason,
        r.details,
        r.status,
        r.reviewed_by,
        r.reviewed_at,
        r.action_taken,
        r.created_at,
        u.username as reporter_username,
        u.display_name as reporter_display_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $1`,
      params
    );

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reports';
    const countParams: string[] = [];
    if (status) {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }
    const countResult = await this.fastify.db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    const hasMore = result.rows.length > limit;
    const reports = result.rows.slice(0, limit).map(this.mapReportRow);
    const lastReport = reports[reports.length - 1];
    const nextCursor = hasMore && lastReport
      ? lastReport.createdAt.toISOString()
      : undefined;

    return { reports, nextCursor, hasMore, total };
  }

  /**
   * Get a single report by ID
   */
  async getById(reportId: string): Promise<Report | null> {
    const result = await this.fastify.db.query(
      `SELECT
        r.id,
        r.reporter_id,
        r.reported_user_id,
        r.reported_shot_id,
        r.reported_comment_id,
        r.reason,
        r.details,
        r.status,
        r.reviewed_by,
        r.reviewed_at,
        r.action_taken,
        r.created_at,
        u.username as reporter_username,
        u.display_name as reporter_display_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      WHERE r.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapReportRow(result.rows[0]);
  }

  /**
   * Update report status (admin only)
   */
  async updateReport(reportId: string, data: UpdateReportData): Promise<Report | null> {
    const result = await this.fastify.db.query(
      `UPDATE reports SET
        status = $1,
        action_taken = $2,
        reviewed_by = $3,
        reviewed_at = NOW()
      WHERE id = $4
      RETURNING id`,
      [data.status, data.actionTaken || null, data.reviewedBy, reportId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.getById(reportId);
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 && result.rows[0].is_admin === true;
  }

  private mapReportRow(row: Record<string, unknown>): Report {
    return {
      id: row.id as string,
      reporterId: row.reporter_id as string,
      reportedUserId: row.reported_user_id as string | undefined,
      reportedShotId: row.reported_shot_id as string | undefined,
      reportedCommentId: row.reported_comment_id as string | undefined,
      reason: row.reason as ReportReason,
      details: row.details as string | undefined,
      status: row.status as ReportStatus,
      reviewedBy: row.reviewed_by as string | undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : undefined,
      actionTaken: row.action_taken as ReportAction | undefined,
      createdAt: new Date(row.created_at as string),
      reporter: row.reporter_username ? {
        id: row.reporter_id as string,
        username: row.reporter_username as string,
        displayName: row.reporter_display_name as string,
      } : undefined,
    };
  }
}
