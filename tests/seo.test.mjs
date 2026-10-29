import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('SEO Suite - Dynamic Sitemap Configuration', async () => {
  const { default: sitemap } = await import('../src/app/sitemap.ts');
  const entries = sitemap();

  assert.ok(Array.isArray(entries), 'sitemap() must return an array');
  assert.equal(entries.length, 2, 'sitemap() must contain exactly 2 public routes');

  const urls = entries.map((e) => e.url);
  assert.ok(urls.includes('https://et-plus.vercel.app'), 'Must include root landing page');
  assert.ok(urls.includes('https://et-plus.vercel.app/login'), 'Must include login route');

  // Must strictly exclude sensitive or protected routes
  for (const url of urls) {
    assert.ok(!url.includes('/dashboard'), `Sitemap must not contain dashboard routes: ${url}`);
    assert.ok(!url.includes('/api/'), `Sitemap must not contain API routes: ${url}`);
  }
});

test('SEO Suite - robots.txt Configuration', async () => {
  const { default: robots } = await import('../src/app/robots.ts');
  const config = robots();

  assert.equal(config.sitemap, 'https://et-plus.vercel.app/sitemap.xml');

  const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
  assert.ok(rules, 'Must have crawling rules');
  assert.equal(rules.userAgent, '*');

  const allow = Array.isArray(rules.allow) ? rules.allow : [rules.allow];
  assert.ok(allow.includes('/') || allow.includes('/login'), 'Must allow public routes');

  const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
  assert.ok(disallow.includes('/api/'), 'Must disallow /api/');
});

test('SEO Suite - Public Landing Page Content & Semantic Hierarchy', async () => {
  const pagePath = path.resolve('src/app/page.tsx');
  const pageSrc = await fs.readFile(pagePath, 'utf-8');

  // Primary H1
  assert.ok(
    pageSrc.includes('ET-PLUS — Student Portal for TKMCE'),
    'Landing page must contain primary H1 heading'
  );

  // 5 Feature Sections
  assert.ok(pageSrc.includes('Attendance Tracking &amp; Forecasting') || pageSrc.includes('Attendance Tracking & Forecasting'), 'Must cover Attendance feature');
  assert.ok(pageSrc.includes('Semester Timetable &amp; Faculty Information') || pageSrc.includes('Semester Timetable & Faculty Information'), 'Must cover Timetable feature');
  assert.ok(pageSrc.includes('Upcoming Assignments &amp; Deadlines') || pageSrc.includes('Upcoming Assignments & Deadlines'), 'Must cover Assignments feature');
  assert.ok(pageSrc.includes('Study Materials &amp; Academic Resources') || pageSrc.includes('Study Materials & Academic Resources'), 'Must cover Study Materials feature');
  assert.ok(pageSrc.includes('Examination Results &amp; Academic Performance') || pageSrc.includes('Examination Results & Academic Performance'), 'Must cover Results feature');

  // Prominent Login Link
  assert.ok(pageSrc.includes('href="/login"'), 'Landing page must contain link to /login');

  // JSON-LD Structured Data
  assert.ok(pageSrc.includes('application/ld+json'), 'Must include JSON-LD structured data');
  assert.ok(pageSrc.includes('EducationalApplication'), 'Must include WebApplication schema');
});

test('SEO Suite - Dashboard Layout Privacy & Noindex Enforcement', async () => {
  const dashLayoutPath = path.resolve('src/app/dashboard/layout.tsx');
  const dashLayoutSrc = await fs.readFile(dashLayoutPath, 'utf-8');

  assert.ok(dashLayoutSrc.includes('index: false'), 'Dashboard layout must set index: false');
  assert.ok(dashLayoutSrc.includes('follow: false'), 'Dashboard layout must set follow: false');
});

test('SEO Suite - Login Layout Metadata & Canonical', async () => {
  const loginLayoutPath = path.resolve('src/app/login/layout.tsx');
  const loginLayoutSrc = await fs.readFile(loginLayoutPath, 'utf-8');

  assert.ok(loginLayoutSrc.includes("canonical: '/login'"), 'Login must configure canonical /login');
  assert.ok(loginLayoutSrc.includes("title: 'Sign In'"), 'Login must configure Sign In title');
});

test('SEO Suite - 404 Not Found Page & Noindex', async () => {
  const notFoundPath = path.resolve('src/app/not-found.tsx');
  const notFoundSrc = await fs.readFile(notFoundPath, 'utf-8');

  assert.ok(notFoundSrc.includes('index: false'), '404 page must be noindex');
  assert.ok(notFoundSrc.includes('href="/"'), '404 page must link to home');
  assert.ok(notFoundSrc.includes('href="/login"'), '404 page must link to login');
});
