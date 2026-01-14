import type { FastifyInstance } from 'fastify';

interface Tag {
  id: string;
  name: string;
  createdAt: Date;
}

interface TrendingTag {
  name: string;
  count: number;
}

export class TagService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Extract hashtags from text
   * Matches #tag format, starting with letter, allowing letters/numbers/underscores
   */
  extractHashtags(text: string): string[] {
    if (!text) return [];

    const regex = /#([a-zA-Z][a-zA-Z0-9_]{0,49})/g;
    const matches = text.match(regex) || [];

    // Remove # prefix, lowercase, and dedupe
    const tags = matches.map(tag => tag.slice(1).toLowerCase());
    return [...new Set(tags)];
  }

  /**
   * Get or create tags by name, returns tag IDs
   */
  async getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    if (tagNames.length === 0) return [];

    // Normalize to lowercase
    const normalizedNames = tagNames.map(name => name.toLowerCase());

    // Insert tags that don't exist, ignore conflicts
    const placeholders = normalizedNames.map((_, i) => `($${i + 1})`).join(', ');
    await this.fastify.db.query(
      `INSERT INTO tags (name) VALUES ${placeholders} ON CONFLICT (name) DO NOTHING`,
      normalizedNames
    );

    // Fetch all tags by name
    const inClause = normalizedNames.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.fastify.db.query(
      `SELECT id, name, created_at FROM tags WHERE name IN (${inClause})`,
      normalizedNames
    );

    return result.rows.map(this.mapTagRow.bind(this));
  }

  /**
   * Attach tags to a shot (replaces existing tags)
   */
  async attachTagsToShot(shotId: string, tagNames: string[]): Promise<void> {
    // Remove existing tags for this shot
    await this.fastify.db.query(
      `DELETE FROM shot_tags WHERE shot_id = $1`,
      [shotId]
    );

    if (tagNames.length === 0) return;

    // Get or create tags
    const tags = await this.getOrCreateTags(tagNames);

    // Insert shot_tags entries
    const values = tags.map((tag, i) => `($1, $${i + 2})`).join(', ');
    const tagIds = tags.map(t => t.id);
    await this.fastify.db.query(
      `INSERT INTO shot_tags (shot_id, tag_id) VALUES ${values}`,
      [shotId, ...tagIds]
    );
  }

  /**
   * Get tags for a shot
   */
  async getTagsForShot(shotId: string): Promise<string[]> {
    const result = await this.fastify.db.query(
      `SELECT t.name
       FROM tags t
       JOIN shot_tags st ON st.tag_id = t.id
       WHERE st.shot_id = $1
       ORDER BY t.name`,
      [shotId]
    );

    return result.rows.map(row => row.name as string);
  }

  /**
   * Get trending tags (most used in last N days)
   */
  async getTrending(days: number = 7, limit: number = 10): Promise<TrendingTag[]> {
    const result = await this.fastify.db.query(
      `SELECT t.name, COUNT(st.shot_id) as count
       FROM tags t
       JOIN shot_tags st ON st.tag_id = t.id
       WHERE st.created_at > NOW() - INTERVAL '1 day' * $1
       GROUP BY t.id, t.name
       ORDER BY count DESC
       LIMIT $2`,
      [days, limit]
    );

    return result.rows.map(row => ({
      name: row.name as string,
      count: parseInt(row.count as string, 10),
    }));
  }

  /**
   * Get a tag by name
   */
  async getByName(name: string): Promise<Tag | null> {
    const result = await this.fastify.db.query(
      `SELECT id, name, created_at FROM tags WHERE name = $1`,
      [name.toLowerCase()]
    );

    if (result.rows.length === 0) return null;
    return this.mapTagRow(result.rows[0]);
  }

  /**
   * Map database row to Tag object
   */
  private mapTagRow(row: Record<string, unknown>): Tag {
    return {
      id: row.id as string,
      name: row.name as string,
      createdAt: new Date(row.created_at as string),
    };
  }
}
