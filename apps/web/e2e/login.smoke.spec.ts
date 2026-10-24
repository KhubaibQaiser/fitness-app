import { expect, test } from '@playwright/test';

const HERO_NAME = 'Illustrated mat, dumbbells, bottle, and progress phone';

test('login screen renders without an API', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Sign in to your coaching workstation')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('hero is visible on a wide viewport and hidden on a narrow one', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');
  await expect(page.getByRole('img', { name: HERO_NAME })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('img', { name: HERO_NAME })).toBeHidden();
  await expect(page.getByText('Sign in to your coaching workstation')).toBeVisible();
});

test('theme toggle stays with the public layout', async ({ page }) => {
  await page.goto('/login');
  const toDark = page.getByRole('button', { name: 'Switch to dark mode' });
  const toLight = page.getByRole('button', { name: 'Switch to light mode' });
  const toggle = (await toDark.isVisible()) ? toDark : toLight;
  const next = (await toDark.isVisible()) ? 'dark' : 'light';
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', next);
  await page.getByRole('link', { name: 'Create coach account' }).click();
  await expect(page.getByText('Create your coaching workspace')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', next);
});

test('hero stays mounted when moving from login to signup', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');
  const hero = page.getByRole('img', { name: HERO_NAME });
  await expect(hero).toBeVisible();
  const heroEl = await hero.elementHandle();

  await page.getByRole('link', { name: 'Create coach account' }).click();
  await expect(page.locator('.gymos-auth-exit-forward')).toBeVisible();
  await expect(page.locator('.gymos-auth-enter-forward')).toBeVisible();
  await expect(page.getByText('Create your coaching workspace')).toBeVisible();
  expect(await heroEl?.evaluate((node) => node.isConnected)).toBe(true);
  await expect(hero).toBeVisible();
});
