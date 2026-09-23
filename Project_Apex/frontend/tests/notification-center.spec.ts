import { test, expect } from '@playwright/test';

/**
 * Notification center e2e coverage (F-23).
 *
 * These tests stub the notification REST endpoints and seed an auth token, so
 * they exercise the real frontend surfaces without a live backend. WebSocket
 * realtime is intentionally not stubbed; polling remains the fallback.
 */

const seedAuth = async (page: import('@playwright/test').Page) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('access_token', 'e2e-token');
    });
};

const stubUser = async (page: import('@playwright/test').Page) => {
    await page.route('**/api/v1/users/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'u-1',
                email: 'test@example.com',
                role: 'user',
                account_tier: 'basic',
                kyc_status: 'APPROVED',
                balance: 10000,
            }),
        });
    });
};

const notification = (id: string, title: string, isRead = false) => ({
    id,
    user_id: 'u-1',
    title,
    message: `Supporting message for ${title} that should wrap cleanly within the row.`,
    notification_type: 'DEPOSIT_CONFIRMED',
    is_read: isRead,
    read_at: isRead ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    action_url: '/transactions',
});

const stubNotifications = async (page: import('@playwright/test').Page) => {
    await page.route('**/api/v1/notifications/unread-count', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 2 }) });
    });
    await page.route('**/api/v1/notifications/preferences', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                email_notifications: true,
                browser_notifications: false,
                copy_trading_alerts: true,
                withdrawal_alerts: true,
                market_updates: false,
                security_alerts: true,
                user_id: 'u-1',
                updated_at: new Date().toISOString(),
            }),
        });
    });
    await page.route('**/api/v1/notifications/mark-all-read', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ marked_read: 2 }) });
    });
    await page.route('**/api/v1/notifications/*', async (route) => {
        const method = route.request().method();
        if (method === 'PATCH' || method === 'DELETE') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
            return;
        }
        await route.continue();
    });
    await page.route('**/api/v1/notifications/?**', async (route) => {
        const url = new URL(route.request().url());
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const unreadOnly = url.searchParams.get('unread_only') === 'true';
        if (offset > 0) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [notification('n-3', 'Older Notification', true)], count: 3 }),
            });
            return;
        }
        const items = unreadOnly
            ? [notification('n-1', 'Withdrawal Rejected'), notification('n-2', 'ROI Payment Received')]
            : [
                  notification('n-1', 'Withdrawal Rejected'),
                  notification('n-2', 'ROI Payment Received'),
              ];
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: items, count: 3 }),
        });
    });
};

test.describe('Notification center responsive surfaces', () => {
    test.beforeEach(async ({ page }) => {
        await seedAuth(page);
        await stubUser(page);
        await stubNotifications(page);
    });

    test('mobile 390x844 opens the bottom sheet with header, filter, and load more', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/dashboard');

        await page.getByRole('button', { name: /unread notifications/i }).click();

        await expect(page.getByRole('button', { name: 'Close notifications' })).toBeVisible();
        await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Mark all read' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Unread' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Load more' })).toBeVisible();
        await expect(page.getByText('Withdrawal Rejected')).toBeVisible();
    });

    test('mobile 430x932 filters to unread and closes via the close control', async ({ page }) => {
        await page.setViewportSize({ width: 430, height: 932 });
        await page.goto('/dashboard');

        await page.getByRole('button', { name: /unread notifications/i }).click();
        await page.getByRole('button', { name: 'Unread' }).click();

        await expect(page.getByText('Withdrawal Rejected')).toBeVisible();
        await page.getByRole('button', { name: 'Close notifications' }).click();
        await expect(page.getByRole('button', { name: 'Close notifications' })).toBeHidden();
    });

    test('desktop 1440x900 opens the anchored popover, navigates on row click, and deletes via overflow', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/dashboard');

        await page.getByRole('button', { name: /unread notifications/i }).click();
        await expect(page.getByText('Withdrawal Rejected')).toBeVisible();

        // Row click navigates through the resolved action URL.
        await page.getByRole('button', { name: 'Open notification: Withdrawal Rejected' }).click();
        await page.waitForURL('**/dashboard/account');
        await page.goBack();

        // Deletion goes through the overflow action and confirmation dialog.
        await page.getByRole('button', { name: /unread notifications/i }).click();
        const deleteRequest = page.waitForRequest(
            (request) =>
                request.method() === 'DELETE' &&
                request.url().includes('/api/v1/notifications/'),
        );
        await page.getByRole('button', { name: 'Actions for Withdrawal Rejected' }).click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();
        await deleteRequest;
    });
});
