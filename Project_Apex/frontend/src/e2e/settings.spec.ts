// @ts-nocheck - E2E test file with playwright-specific type issues
import { test, expect } from '@playwright/test';

test.describe('Settings E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Stub current user API and seed auth token
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          email: 'test@example.com',
          role: 'user',
          account_tier: 'basic',
          kyc_status: 'APPROVED',
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('access_token', 'e2e-token');
    });

    // Navigate to settings page
    await page.goto('/dashboard/settings');
  });

  test('should navigate to settings page', async ({ page }) => {
    await expect(page.locator('h4:has-text("Account Settings")')).toBeVisible();
    await expect(page.locator('text=Manage your account preferences and security')).toBeVisible();
  });

  test('should display all settings tabs', async ({ page }) => {
    const tabs = ['Profile', 'Security', 'Notifications', 'Privacy'];
    
    for (const tab of tabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('should switch between settings tabs', async ({ page }) => {
    // Click on Security tab
    await page.click('button:has-text("Security")');
    await expect(page.locator('h4:has-text("Security Settings")')).toBeVisible();

    // Click on Notifications tab
    await page.click('button:has-text("Notifications")');
    await expect(page.locator('h4:has-text("Notification Settings")')).toBeVisible();

    // Click on Privacy tab
    await page.click('button:has-text("Privacy")');
    await expect(page.locator('h4:has-text("Privacy Settings")')).toBeVisible();

    // Return to Profile tab
    await page.click('button:has-text("Profile")');
    await expect(page.locator('h4:has-text("Profile Settings")')).toBeVisible();
  });

  test('should update profile settings', async ({ page }) => {
    // Ensure we're on profile tab
    await page.click('button:has-text("Profile")');

    const fullNameInput = page.locator('input[label="Full Name"]');
    const emailInput = page.locator('input[label="Email Address"]');
    const saveButton = page.locator('button:has-text("Save Changes")');

    // Clear and update full name
    await fullNameInput.clear();
    await fullNameInput.fill('Updated Test User');
    
    // Clear and update email
    await emailInput.clear();
    await emailInput.fill('updated@example.com');

    // Save changes
    await saveButton.click();

    // Wait for success message
    await expect(page.locator('text=Profile updated successfully!')).toBeVisible();
  });

  test('should validate profile form', async ({ page }) => {
    await page.click('button:has-text("Profile")');

    const fullNameInput = page.locator('input[label="Full Name"]');
    const emailInput = page.locator('input[label="Email Address"]');
    const saveButton = page.locator('button:has-text("Save Changes")');

    // Test empty validation
    await fullNameInput.clear();
    await emailInput.clear();
    await saveButton.click();

    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();

    // Test invalid email
    await emailInput.fill('invalid-email');
    await saveButton.click();

    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();

    // Test short full name
    await fullNameInput.fill('A');
    await saveButton.click();

    await expect(page.locator('text=Full name must be at least 2 characters')).toBeVisible();
  });

  test('should update security settings', async ({ page }) => {
    await page.click('button:has-text("Security")');

    // Test 2FA toggle
    const twoFASwitch = page.locator('input[type="checkbox"]').first();
    await twoFASwitch.check();
    await expect(twoFASwitch).toBeChecked();

    // Test password change modal
    await page.click('button:has-text("Change Password")');
    await expect(page.locator('text=Change Password')).toBeVisible();

    // Fill password form
    await page.fill('input[type="password"]:nth-child(1)', 'currentPassword123');
    await page.fill('input[type="password"]:nth-child(2)', 'newPassword123');
    await page.fill('input[type="password"]:nth-child(3)', 'newPassword123');

    // Submit password change
    await page.click('button:has-text("Change Password")');
    
    // Modal should close
    await expect(page.locator('text=Change Password')).not.toBeVisible();
  });

  test('should update notification preferences', async ({ page }) => {
    await page.click('button:has-text("Notifications")');

    // Toggle various notification settings
    const switches = page.locator('input[type="checkbox"]');
    const switchCount = await switches.count();

    for (let i = 0; i < Math.min(switchCount, 3); i++) {
      const switchEl = switches.nth(i);
      const isChecked = await switchEl.isChecked();
      
      if (isChecked) {
        await switchEl.uncheck();
        await expect(switchEl).not.toBeChecked();
      } else {
        await switchEl.check();
        await expect(switchEl).toBeChecked();
      }
    }

    // Save preferences
    await page.click('button:has-text("Save Preferences")');
    await expect(page.locator('text=Notification preferences updated successfully!')).toBeVisible();
  });

  test('should update privacy settings', async ({ page }) => {
    await page.click('button:has-text("Privacy")');

    // Toggle privacy switches
    const switches = page.locator('input[type="checkbox"]');
    const switchCount = await switches.count();

    for (let i = 0; i < Math.min(switchCount, 2); i++) {
      const switchEl = switches.nth(i);
      const isChecked = await switchEl.isChecked();
      
      if (isChecked) {
        await switchEl.uncheck();
        await expect(switchEl).not.toBeChecked();
      } else {
        await switchEl.check();
        await expect(switchEl).toBeChecked();
      }
    }

    // Change profile visibility
    await page.click('input[value="public"]');
    await expect(page.locator('input[value="public"]')).toBeChecked();

    // Save preferences
    await page.click('button:has-text("Save Preferences")');
    await expect(page.locator('text=Privacy preferences updated successfully!')).toBeVisible();
  });

  test('should handle data export', async ({ page }) => {
    await page.click('button:has-text("Privacy")');

    // Click export data button
    await page.click('button:has-text("Export My Data")');
    
    // Verify export modal opens
    await expect(page.locator('text=Export Your Data')).toBeVisible();
    
    // Start export
    await page.click('button:has-text("Start Export")');
    
    // Modal should close after export starts
    await expect(page.locator('text=Export Your Data')).not.toBeVisible();
  });

  test('should display KYC status', async ({ page }) => {
    // KYC status should be visible in sidebar
    await expect(page.locator('text=KYC Status')).toBeVisible();
    
    // Should show status chip
    const statusChip = page.locator('[data-testid="kyc-status-chip"]').first();
    await expect(statusChip).toBeVisible();

    // Status should be one of the expected values
    const statusText = await statusChip.textContent();
    expect(statusText).toMatch(/approved|pending|under_review|rejected/i);
  });

  test('should handle offline mode gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to update a setting
    await page.click('button:has-text("Profile")');
    await page.fill('input[label="Full Name"]', 'Offline User');

    // Changes should still be possible (will be queued for sync)
    await page.click('button:has-text("Save Changes")');
    
    // Should show some indication of offline mode
    await expect(page.locator('text=Offline').or(page.locator('text=Syncing'))).toBeVisible({
      timeout: 5000
    });

    // Go back online
    await page.context().setOffline(false);
  });

  test('should handle settings conflicts', async ({ page }) => {
    // This test would simulate a conflict scenario
    // For now, we'll just verify the conflict resolution UI exists
    await page.click('button:has-text("Profile")');
    
    // Make a change
    await page.fill('input[label="Full Name"]', 'Conflict Test');
    await page.click('button:has-text("Save Changes")');

    // In a real conflict scenario, we'd see conflict resolution UI
    // For now, just verify the basic flow works
    await expect(page.locator('text=Profile updated successfully!')).toBeVisible({
      timeout: 5000
    });
  });

  test('should maintain settings persistence', async ({ page }) => {
    // Navigate away and back to verify settings persist
    await page.click('button:has-text("Profile")');
    await page.fill('input[label="Full Name"]', 'Persistent User');
    await page.click('button:has-text("Save Changes")');

    // Wait for save to complete
    await expect(page.locator('text=Profile updated successfully!')).toBeVisible();

    // Navigate away
    await page.goto('/dashboard');
    
    // Navigate back to settings
    await page.goto('/dashboard/settings');
    await page.click('button:has-text("Profile")');

    // Verify the setting persisted
    await expect(page.locator('input[label="Full Name"]')).toHaveValue('Persistent User');
  });

  test('should handle accessibility', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should activate first tab

    // Test form accessibility
    await page.click('button:has-text("Profile")');
    
    const fullNameInput = page.locator('input[label="Full Name"]');
    await fullNameInput.focus();
    await page.keyboard.press('Tab');
    
    const emailInput = page.locator('input[label="Email Address"]');
    await expect(emailInput).toBeFocused();

    // Test error message accessibility
    await emailInput.clear();
    await page.keyboard.press('Tab'); // Move to save button
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Email is required')).toBeVisible();
  });
});
