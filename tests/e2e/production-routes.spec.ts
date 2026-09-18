import { test, expect } from '@playwright/test'

const publicRoutes = ['/', '/pricing', '/features', '/faq', '/privacy', '/terms', '/cookies', '/login', '/register', '/recover']
const protectedRoutes = ['/dashboard', '/cases', '/clients', '/templates', '/reminders', '/team', '/billing', '/settings', '/audit', '/usage', '/completion', '/correction', '/upload', '/onboarding', '/security', '/notifications', '/reports']

test.describe('production route smoke', () => {
  for (const route of publicRoutes) {
    test(`public route ${route}`, async ({ page }) => {
      const response = await page.goto(route)
      expect(response?.status()).toBeLessThan(400)
    })
  }

  for (const route of protectedRoutes) {
    test(`protected route ${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login\?next=/)
    })
  }
})
