/**
 * api/page.js
 *
 * Serves index.html with correct OG meta tags already injected server-side,
 * so social scrapers (WhatsApp, iMessage, Telegram, etc.) get the right
 * og:image and og:url without needing to execute JavaScript.
 *
 * Route: /:id(\d{12,15})  → configured in vercel.json
 *
 * For regular browsers the page is functionally identical to index.html —
 * the JS bootstrap still runs and fetches the blob as before.
 */

import { readFileSync } from 'fs';
import { join }         from 'path';

// Is this request from a known social scraper / bot?
function isScraper(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return (
    lower.includes('facebookexternalhit') ||
    lower.includes('twitterbot')          ||
    lower.includes('whatsapp')            ||
    lower.includes('telegrambot')         ||
    lower.includes('linkedinbot')         ||
    lower.includes('slackbot')            ||
    lower.includes('discordbot')          ||
    lower.includes('applebot')            ||
    lower.includes('iMessageSummaryBot')  ||
    lower.includes('imessage')            ||
    lower.includes('googlebot')           ||
    lower.includes('bingbot')             ||
    lower.includes('yandexbot')           ||
    lower.includes('duckduckbot')         ||
    lower.includes('embedly')             ||
    lower.includes('outbrain')            ||
    lower.includes('pinterest')           ||
    lower.includes('semrushbot')          ||
    lower.includes('ahrefsbot')
  );
}

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  // Extract id from path or query (vercel rewrites pass it as query param)
  const id = req.query.id || (req.url.match(/\/(\d{12,15})/) || [])[1];

  if (!id || !/^\d{12,15}$/.test(id)) {
    return res.redirect(302, 'https://naqsh-athar.link');
  }

  const base      = 'https://naqsh-athar.link';
  const pageUrl   = `${base}/${id}`;
  const imgUrl    = `${base}/api/og?id=${id}&mode=og`;

  // Read index.html from the public directory
  // In Vercel, public files are served from the outputDirectory root
  let html;
  try {
    // Try multiple possible paths
    const candidates = [
      join(process.cwd(), 'public', 'index.html'),
      join(process.cwd(), 'index.html'),
    ];
    for (const p of candidates) {
      try { html = readFileSync(p, 'utf8'); break; } catch (_) {}
    }
    if (!html) throw new Error('index.html not found');
  } catch (err) {
    console.error('page.js: could not read index.html:', err.message);
    return res.status(500).send('Internal error');
  }

  // Inject correct OG tags — replace the static defaults
  html = html
    .replace(
      /(<meta\s+property="og:image"\s+content=")[^"]*(")/,
      `$1${imgUrl}$2`
    )
    .replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${pageUrl}$2`
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1Naqsh-Athar · ${id}$2`
    );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Scrapers: short cache so updates propagate; browsers: no-store so JS always runs fresh
  const ua = req.headers['user-agent'] || '';
  if (isScraper(ua)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }

  return res.status(200).send(html);
}
