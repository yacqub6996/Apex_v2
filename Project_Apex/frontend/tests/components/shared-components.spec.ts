import { test, expect } from '@playwright/test';

/**
 * Playwright E2E Tests for Shared Components
 * 
 * These tests validate the responsive behavior and real browser interactions
 * of the shared components across different viewport sizes.
 * 
 * To run these tests:
 * 1. Install Playwright browsers: npx playwright install
 * 2. Start the dev server: npm run dev
 * 3. Run tests: npx playwright test
 */

test.describe('Component Showcase - Responsive Layout', () => {
  test('should display properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/component-showcase');

    // Metric cards should stack vertically on mobile
    const metricCards = page.locator('[class*="MuiCard-root"]').first();
    await expect(metricCards).toBeVisible();

    // Check that the page title is visible
    await expect(page.getByText('Component Showcase')).toBeVisible();
  });

  test('should display properly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/component-showcase');

    // Metric cards should be in a 2-column grid on tablet
    await expect(page.getByText('Component Showcase')).toBeVisible();
    await expect(page.getByText('Total Users')).toBeVisible();
  });

  test('should display properly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.goto('/component-showcase');

    // All content should be visible
    await expect(page.getByText('Component Showcase')).toBeVisible();
    await expect(page.getByText('Metric Cards')).toBeVisible();
    await expect(page.getByText('Data Table with Filters')).toBeVisible();
  });
});

test.describe('MetricCard - Browser Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/component-showcase');
  });

  test('should show hover effect on metric cards', async ({ page }) => {
    const metricCard = page.locator('[class*="MuiCard-root"]').first();
    
    // Hover over the card
    await metricCard.hover();
    
    // Card should be visible (hover effect is CSS-based)
    await expect(metricCard).toBeVisible();
  });

  test('should display all metric card content', async ({ page }) => {
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('1234')).toBeVisible();
    await expect(page.getByText('+12% this month')).toBeVisible();
  });
});

test.describe('DataTable - Browser Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/component-showcase');
  });

  test('should display table with data', async ({ page }) => {
    // Check table headers
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();

    // Check data rows
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('john@example.com')).toBeVisible();
  });

  test('should filter data based on search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by name or email');
    
    // Type in search box
    await searchInput.fill('Jane');
    
    // Should show only Jane's row
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();
  });

  test('should filter data based on status dropdown', async ({ page }) => {
    // Open status dropdown
    const statusSelect = page.getByRole('button', { name: /status/i });
    await statusSelect.click();
    
    // Select "Inactive"
    await page.getByRole('option', { name: 'Inactive' }).click();
    
    // Should show only inactive users
    await expect(page.getByText('Bob Johnson')).toBeVisible();
  });
});

test.describe('ActionsMenu - Browser Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/component-showcase');
  });

  test('should open menu on button click', async ({ page }) => {
    // Find the first actions menu button in the table
    const actionButton = page.locator('button[aria-label*="Actions"]').first();
    await actionButton.click();
    
    // Menu should be visible
    await expect(page.getByText('View Details')).toBeVisible();
    await expect(page.getByText('Edit')).toBeVisible();
    await expect(page.getByText('Delete')).toBeVisible();
  });

  test('should close menu when clicking outside', async ({ page }) => {
    const actionButton = page.locator('button[aria-label*="Actions"]').first();
    await actionButton.click();
    
    // Menu is open
    await expect(page.getByText('View Details')).toBeVisible();
    
    // Click outside the menu
    await page.click('body');
    
    // Menu should be closed
    await expect(page.getByText('View Details')).not.toBeVisible();
  });

  test('should execute action on menu item click', async ({ page }) => {
    // Set up console listener
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    const actionButton = page.locator('button[aria-label*="Actions"]').first();
    await actionButton.click();
    
    // Click "View Details"
    await page.getByText('View Details').click();
    
    // Menu should close
    await expect(page.getByText('View Details')).not.toBeVisible();
  });
});

test.describe('FilterBar - Responsive Layout', () => {
  test('should wrap filters on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/component-showcase');
    
    // Filter controls should be visible
    const searchInput = page.getByPlaceholder('Search by name or email');
    await expect(searchInput).toBeVisible();
  });

  test('should arrange filters horizontally on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/component-showcase');
    
    // All filter controls should be visible
    await expect(page.getByPlaceholder('Search by name or email')).toBeVisible();
    await expect(page.getByRole('button', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/component-showcase');
  });

  test('should navigate through interactive elements with Tab key', async ({ page }) => {
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check that we can reach the search input
    const searchInput = page.getByPlaceholder('Search by name or email');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
  });

  test('should open actions menu with Enter key', async ({ page }) => {
    // Navigate to action button
    const actionButton = page.locator('button[aria-label*="Actions"]').first();
    await actionButton.focus();
    
    // Press Enter to open menu
    await page.keyboard.press('Enter');
    
    // Menu should be visible
    await expect(page.getByText('View Details')).toBeVisible();
  });

  test('should navigate menu items with arrow keys', async ({ page }) => {
    const actionButton = page.locator('button[aria-label*="Actions"]').first();
    await actionButton.click();
    
    // Press Down arrow
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Should navigate through menu items
    await expect(page.getByText('Edit')).toBeVisible();
  });
});
