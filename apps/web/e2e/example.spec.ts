import { test, expect } from '@playwright/test';

test.describe('Smoke test', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.*$/);
    await expect(page.locator('body')).toBeVisible();
  });
});
