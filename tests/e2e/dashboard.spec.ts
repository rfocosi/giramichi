import { test, expect } from '@playwright/test';

test.describe('Giramichi Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard and verify header branding', async ({ page }) => {
    // Check main title
    await expect(page.locator('h1')).toContainText('Giramichi');
  });

  test('should render Kanban columns and task cards', async ({ page }) => {
    // Wait for kanban board container
    const boardContainer = page.locator('.board-container');
    await expect(boardContainer).toBeVisible();

    // Verify status columns exist
    const columns = page.locator('.kanban-column');
    const colCount = await columns.count();
    expect(colCount).toBeGreaterThanOrEqual(3);

    // Verify status column headers exist on the board
    await expect(page.locator('.kanban-column:has-text("Waiting")').first()).toBeVisible();
    await expect(page.locator('.kanban-column:has-text("In Progress")').first()).toBeVisible();
    await expect(page.locator('.kanban-column:has-text("Done")').first()).toBeVisible();

    // Verify task cards rendered in board
    const taskCards = page.locator('.task-card');
    const count = await taskCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter task cards when selecting a tag pill', async ({ page }) => {
    // Check tag filter bar
    const tagFilterBar = page.locator('.tag-filter-bar');
    await expect(tagFilterBar).toBeVisible();

    // Locate tag chips
    const tagChips = tagFilterBar.locator('.tag-chip');
    const chipCount = await tagChips.count();
    expect(chipCount).toBeGreaterThan(0);

    // Click first tag chip
    const firstChip = tagChips.first();
    await firstChip.click();

    // Verify chip is active
    await expect(firstChip).toHaveClass(/active/);

    // Verify clear filter button appears
    const clearBtn = tagFilterBar.locator('button:has-text("Clear")');
    await expect(clearBtn).toBeVisible();

    // Click clear filter
    await clearBtn.click();
    await expect(firstChip).not.toHaveClass(/active/);
  });

  test('should open and close task detail modal on task card click', async ({ page }) => {
    // Click the first task card
    const firstTaskCard = page.locator('.task-card').first();
    await expect(firstTaskCard).toBeVisible();
    await firstTaskCard.click();

    // Modal overlay should be visible
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();

    // Verify modal close button in header
    const closeBtn = modal.locator('.modal-content button').first();
    await expect(closeBtn).toBeVisible();

    // Close modal
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('should toggle activity log drawer', async ({ page }) => {
    // Find Activity Stream toggle button in header
    const activityBtn = page.locator('button:has-text("Activity Stream")');
    await expect(activityBtn).toBeVisible();

    // Toggle open
    await activityBtn.click();
    
    // Verify drawer content opens
    const drawer = page.locator('.drawer-content');
    await expect(drawer).toBeVisible();

    // Toggle close
    const closeBtn = drawer.locator('button').first();
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();
  });
});
