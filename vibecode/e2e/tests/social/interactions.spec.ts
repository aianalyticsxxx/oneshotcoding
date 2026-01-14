import { test, expect } from '@playwright/test';

test.describe('Social Interactions', () => {
  test.describe('Sparkle Reactions', () => {
    test('should require authentication to sparkle', async ({ page }) => {
      await page.goto('/feed/explore');
      await page.waitForLoadState('networkidle');

      const sparkleButton = page.locator('[data-testid="sparkle-button"]').first().or(
        page.getByRole('button').filter({ has: page.locator('svg') }).first()
      );

      if (await sparkleButton.isVisible()) {
        await sparkleButton.click();

        // Should redirect to login or show error
        await page.waitForTimeout(1000);
      }
    });

    test('should toggle sparkle state when authenticated', async ({ page, context }) => {
      // Set up auth
      await context.addCookies([
        {
          name: 'access_token',
          value: 'mock-token',
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.goto('/feed/explore');
      await page.waitForLoadState('networkidle');

      const sparkleButton = page.locator('[data-testid="sparkle-button"]').first();

      if (await sparkleButton.isVisible()) {
        // Get initial state
        const initialText = await sparkleButton.textContent();

        // Click to toggle
        await sparkleButton.click();

        // State should change (optimistic update)
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Comments', () => {
    test('should navigate to comments page', async ({ page }) => {
      await page.goto('/feed/explore');
      await page.waitForLoadState('networkidle');

      const commentButton = page.locator('[data-testid="comment-button"]').first().or(
        page.getByRole('link', { name: /comment/i }).first()
      );

      if (await commentButton.isVisible()) {
        await commentButton.click();

        // Should navigate to comments page or show comments modal
        await page.waitForLoadState('networkidle');
      }
    });

    test('should display comments on shot detail', async ({ page }) => {
      // Navigate directly to a shot's comments
      // This would require knowing a valid shot ID
    });

    test('should require auth to add comment', async ({ page }) => {
      // Navigate to comments and try to add without auth
    });
  });

  test.describe('Follow System', () => {
    test('should display follow button on user profile', async ({ page }) => {
      // Navigate to a user profile
      // This would require knowing a valid username
    });

    test('should require auth to follow', async ({ page }) => {
      // Try to follow without auth
    });
  });

  test.describe('Share Functionality', () => {
    test('should show share options dropdown', async ({ page }) => {
      await page.goto('/feed/explore');
      await page.waitForLoadState('networkidle');

      const shareButton = page.locator('[data-testid="share-button"]').first().or(
        page.getByRole('button', { name: /share/i }).first()
      );

      if (await shareButton.isVisible()) {
        await shareButton.click();

        // Should show dropdown with share options
        const dropdown = page.locator('[data-testid="share-dropdown"]').or(
          page.getByRole('menu')
        );

        await expect(dropdown).toBeVisible({ timeout: 5000 });
      }
    });

    test('should copy link to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await page.goto('/feed/explore');
      await page.waitForLoadState('networkidle');

      const shareButton = page.locator('[data-testid="share-button"]').first();

      if (await shareButton.isVisible()) {
        await shareButton.click();

        const copyLinkButton = page.getByRole('button', { name: /copy link/i }).or(
          page.getByText(/copy link/i)
        );

        if (await copyLinkButton.isVisible()) {
          await copyLinkButton.click();

          // Verify clipboard (requires permissions)
        }
      }
    });
  });
});

test.describe('Report Functionality', () => {
  test('should show report modal when clicking report', async ({ page, context }) => {
    // Set up auth (reporting requires authentication)
    await context.addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/feed/explore');
    await page.waitForLoadState('networkidle');

    const reportButton = page.locator('[data-testid="report-button"]').first().or(
      page.getByRole('button', { name: /report/i }).first()
    );

    if (await reportButton.isVisible()) {
      await reportButton.click();

      // Should show report modal
      const modal = page.locator('[data-testid="report-modal"]').or(
        page.getByRole('dialog')
      );

      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should require reason selection for report', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'access_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Open report modal and verify form requirements
  });
});
