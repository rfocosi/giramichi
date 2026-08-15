import { test, expect } from '@playwright/test';

test.describe('Giramichi Reports & Analytics UI E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. should switch between Kanban Board and Analytics & Reports views', async ({ page }) => {
    // Check initial view is Kanban Board
    await expect(page.locator('button:has-text("Kanban Board")')).toBeVisible();
    const reportsTab = page.locator('button:has-text("Analytics & Reports")');
    await expect(reportsTab).toBeVisible();

    // Click Analytics & Reports tab
    await reportsTab.click();

    // Verify Reports page components render
    await expect(page.locator('text=Agent Velocity')).toBeVisible();
    await expect(page.locator('text=Mean Cycle Time')).toBeVisible();
    await expect(page.locator('text=Total Tokens')).toBeVisible();
    await expect(page.locator('text=Incurred LLM Cost')).toBeVisible();
    await expect(page.locator('text=Engineering ROI')).toBeVisible();

    // Switch back to Kanban Board
    const boardTab = page.locator('button:has-text("Kanban Board")');
    await boardTab.click();
    await expect(page.locator('.kanban-column').first()).toBeVisible();
  });

  test('2. should display Executive KPI cards and charts in Reports view', async ({ page }) => {
    // Switch to Reports tab
    await page.locator('button:has-text("Analytics & Reports")').click();

    // Verify Charts
    await expect(page.locator('text=Stage Dwell Times & Bottlenecks')).toBeVisible();
    await expect(page.locator('text=Resource & Spend Breakdown')).toBeVisible();

    // Verify dimension tabs in Resource Breakdown
    const agentsBtn = page.locator('button:has-text("Agents")');
    const modelsBtn = page.locator('button:has-text("Models")');
    const tagsBtn = page.locator('button:has-text("Tags")');
    const priorityBtn = page.locator('button:has-text("Priority")');

    await expect(agentsBtn).toBeVisible();
    await expect(modelsBtn).toBeVisible();
    await expect(tagsBtn).toBeVisible();
    await expect(priorityBtn).toBeVisible();

    // Switch to Models tab
    await modelsBtn.click();

    // Switch to Tags tab
    await tagsBtn.click();
  });

  test('3. should open Sprint Retrospective modal and allow copying / downloading', async ({ page }) => {
    // Switch to Reports tab
    await page.locator('button:has-text("Analytics & Reports")').click();

    // Click Generate Sprint Retrospective button
    const retroBtn = page.locator('button:has-text("Generate Sprint Retrospective")');
    await expect(retroBtn).toBeVisible();
    await retroBtn.click();

    // Check modal appears
    await expect(page.locator('text=Sprint Retrospective Summary')).toBeVisible();
    await expect(page.locator('text=Copy Markdown Report')).toBeVisible();
    await expect(page.locator('text=Download .md')).toBeVisible();
    await expect(page.locator('text=Export Raw JSON')).toBeVisible();

    // Close modal
    const closeBtn = page.locator('.glass-panel button:has-text("Download .md")').locator('xpath=ancestor::div[contains(@class, "glass-panel")]//button').first();
    // Or close by clicking backdrop or top right close
    await page.keyboard.press('Escape');
  });

  test('4. should search and filter the Task Telemetry Table', async ({ page }) => {
    // Switch to Reports tab
    await page.locator('button:has-text("Analytics & Reports")').click();

    // Verify table header
    await expect(page.locator('text=Task-Level Telemetry & Cost Drilldown')).toBeVisible();

    // Type in search box
    const searchInput = page.locator('input[placeholder="Search tasks, agents, tags..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('GIRA');

    // Verify rows exist
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
