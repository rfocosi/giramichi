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
    const closeBtn = modal.locator('#modal-close-btn');
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

  test('should render page footer with dashboard and server versions', async ({ page }) => {
    // Locate footer
    const footer = page.locator('#dashboard-footer');
    await expect(footer).toBeVisible();

    // Verify Dashboard version pill
    const dashboardPill = page.locator('#dashboard-version');
    await expect(dashboardPill).toBeVisible();
    await expect(dashboardPill).toContainText('Dashboard');
    await expect(dashboardPill).toContainText(/v\d+\.\d+\.\d+/);

    // Verify Server version pill
    const serverPill = page.locator('#server-version');
    await expect(serverPill).toBeVisible();
    await expect(serverPill).toContainText('Server');
    await expect(serverPill).toContainText(/v\d+\.\d+\.\d+/);
  });

  test('should render copy session ID and copy session link buttons', async ({ page }) => {
    const copyIdBtn = page.locator('#copy-session-id-btn');
    const copyLinkBtn = page.locator('#copy-session-link-btn');

    await expect(copyIdBtn).toBeVisible();
    await expect(copyLinkBtn).toBeVisible();
    await expect(copyIdBtn).toHaveAttribute('aria-label', /Copy Session ID/);
    await expect(copyLinkBtn).toHaveAttribute('aria-label', /Copy Session Link/);

    // On default 'all' view, both Copy ID and Copy Link are disabled
    await expect(copyIdBtn).toBeDisabled();
    await expect(copyLinkBtn).toBeDisabled();
  });

  test('should enable Copy ID when a session is selected and update URL', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const sessionSelect = page.locator('header select');
    await expect(sessionSelect).toBeVisible();

    const options = sessionSelect.locator('option');
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Select the first real session option (index 1)
      const secondOptionValue = await options.nth(1).getAttribute('value');
      if (secondOptionValue && secondOptionValue !== 'all') {
        await sessionSelect.selectOption(secondOptionValue);

        // Verify URL updated with session_id query param
        await expect(page).toHaveURL(new RegExp(`session_id=${secondOptionValue}`));

        // Copy ID button should now be enabled
        const copyIdBtn = page.locator('#copy-session-id-btn');
        await expect(copyIdBtn).toBeEnabled();

        // Click Copy ID and check feedback (title & aria-label)
        await copyIdBtn.click();
        await expect(copyIdBtn).toHaveAttribute('title', 'Session ID copied!');
        await expect(copyIdBtn).toHaveAttribute('aria-label', 'Session ID copied');

        // Click Copy Link and check feedback (title & aria-label)
        const copyLinkBtn = page.locator('#copy-session-link-btn');
        await copyLinkBtn.click();
        await expect(copyLinkBtn).toHaveAttribute('title', 'Session link copied!');
        await expect(copyLinkBtn).toHaveAttribute('aria-label', 'Session link copied');
      }
    }
  });

  test('should restore session from URL query parameter on page load', async ({ page }) => {
    const sessionSelect = page.locator('header select');
    await expect(sessionSelect).toBeVisible();

    const options = sessionSelect.locator('option');
    const optionCount = await options.count();

    if (optionCount > 1) {
      const targetSessionId = await options.nth(1).getAttribute('value');
      if (targetSessionId && targetSessionId !== 'all') {
        // Navigate directly with query parameter
        await page.goto(`/?session_id=${targetSessionId}`);

        // Verify select dropdown matches the URL query parameter
        await expect(sessionSelect).toHaveValue(targetSessionId);

        // Copy ID button should be enabled
        const copyIdBtn = page.locator('#copy-session-id-btn');
        await expect(copyIdBtn).toBeEnabled();
      }
    }
  });

  test('should copy task link from TaskCard on Kanban board', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const taskCard = page.locator('.task-card').first();
    await expect(taskCard).toBeVisible();

    const taskId = await taskCard.locator('.task-id').innerText();
    const copyTaskLinkBtn = taskCard.locator('.task-copy-link-btn');
    await expect(copyTaskLinkBtn).toBeVisible();

    // Click copy task link
    await copyTaskLinkBtn.click();
    await expect(copyTaskLinkBtn).toHaveAttribute('title', 'Task link copied!');

    // Verify clicking copy link did not open the modal
    const modal = page.locator('.modal-overlay');
    await expect(modal).not.toBeVisible();
  });

  test('should copy task link from TaskDetailModal header and close modal', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const taskCard = page.locator('.task-card').first();
    await expect(taskCard).toBeVisible();
    const taskId = await taskCard.locator('.task-id').innerText();

    // Open modal
    await taskCard.click();
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();

    // Verify task_id is in URL
    await expect(page).toHaveURL(new RegExp(`task_id=${taskId}`));

    // Copy link from modal
    const modalCopyBtn = page.locator('#modal-copy-task-link-btn');
    await expect(modalCopyBtn).toBeVisible();
    await modalCopyBtn.click();
    await expect(modalCopyBtn).toHaveAttribute('title', 'Task link copied!');

    // Close modal
    const closeBtn = modal.locator('#modal-close-btn');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();

    // Verify task_id removed from URL
    await expect(page).not.toHaveURL(/task_id=/);
  });

  test('should open task modal directly when navigating with ?task_id= query param', async ({ page }) => {
    // Get first task ID
    const taskCard = page.locator('.task-card').first();
    await expect(taskCard).toBeVisible();
    const taskId = await taskCard.locator('.task-id').innerText();

    // Navigate directly with ?task_id=
    await page.goto(`/?task_id=${taskId}`);

    // Modal should be automatically open
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.task-id')).toContainText(taskId);
  });
});

