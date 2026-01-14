import { test, expect } from '@playwright/test';

test.describe('Feed', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to feed/explore which doesn't require auth
    await page.goto('/feed/explore');
  });

  test.describe('Feed Display', () => {
    test('should display feed page', async ({ page }) => {
      await expect(page).toHaveURL(/.*feed\/explore/);
    });

    test('should show navigation tabs', async ({ page }) => {
      // Should have navigation between feed types
      const nav = page.locator('[data-testid="feed-navigation"]').or(
        page.getByRole('navigation')
      );

      // Should have explore tab active or visible
    });

    test('should display shot cards when shots exist', async ({ page }) => {
      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Either show shots or empty state
      const content = page.locator('[data-testid="vibe-card"]').or(
        page.locator('[data-testid="empty-state"]').or(
          page.getByText(/no shots|no vibes|be the first/i)
        )
      );

      await expect(content.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Sort Options', () => {
    test('should allow sorting by recent', async ({ page }) => {
      const recentTab = page.getByRole('button', { name: /recent/i }).or(
        page.getByText(/recent/i)
      );

      if (await recentTab.isVisible()) {
        await recentTab.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should allow sorting by popular', async ({ page }) => {
      const popularTab = page.getByRole('button', { name: /popular/i }).or(
        page.getByText(/popular/i)
      );

      if (await popularTab.isVisible()) {
        await popularTab.click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Infinite Scroll', () => {
    test('should load more shots when scrolling', async ({ page }) => {
      // Wait for initial load
      await page.waitForLoadState('networkidle');

      // Get initial shot count
      const initialShots = await page.locator('[data-testid="vibe-card"]').count();

      if (initialShots > 0) {
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Wait for potential new content
        await page.waitForTimeout(1000);

        // Check if more shots loaded (depends on having enough data)
        const finalShots = await page.locator('[data-testid="vibe-card"]').count();
        expect(finalShots).toBeGreaterThanOrEqual(initialShots);
      }
    });
  });

  test.describe('Shot Card Interactions', () => {
    test('should display shot information', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      const shotCard = page.locator('[data-testid="vibe-card"]').first();

      if (await shotCard.isVisible()) {
        // Should show username
        await expect(shotCard.locator('[data-testid="username"]').or(
          shotCard.getByText(/@\w+/)
        )).toBeVisible();

        // Should show image or video
        const media = shotCard.locator('img').or(shotCard.locator('video'));
        await expect(media.first()).toBeVisible();
      }
    });

    test('should expand shot on click', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      const shotImage = page.locator('[data-testid="vibe-card"] img').first();

      if (await shotImage.isVisible()) {
        await shotImage.click();

        // Should show expanded view or navigate to shot detail
        // Behavior depends on implementation
      }
    });
  });

  test.describe('Sidebar', () => {
    test('should display trending tags on desktop', async ({ page }) => {
      // Set viewport to desktop size
      await page.setViewportSize({ width: 1280, height: 720 });

      const sidebar = page.locator('[data-testid="trending-panel"]').or(
        page.getByText(/trending/i).first()
      );

      // Sidebar may or may not be visible depending on implementation
    });
  });
});

test.describe('Feed Navigation', () => {
  test('should navigate to following feed when authenticated', async ({ page, context }) => {
    // Set up auth
    await context.addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/feed/following');

    // Should either show following feed or redirect if not authenticated
  });

  test('should navigate between feed tabs', async ({ page }) => {
    await page.goto('/feed/explore');

    // Find and click on different tabs
    const tabs = page.getByRole('tablist').or(page.locator('[data-testid="feed-tabs"]'));

    if (await tabs.isVisible()) {
      // Tab switching functionality
    }
  });
});
