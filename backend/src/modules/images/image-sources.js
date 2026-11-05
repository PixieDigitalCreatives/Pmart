'use strict';

const dns = require('dns').promises;
const net = require('net');
const { env } = require('../../config/env');
const { isValidGtin } = require('../../utils/barcode');
const { ImageOrigin } = require('./image.model');
const { badRequest, HttpError } = require('../../utils/http-error');

/**
 * Open product databases queried by exact barcode. Each returns the product the barcode belongs to, so a
 * result is a real record for that GTIN, never a name-based guess. Results are only ever stored as
 * PENDING candidates for a person to verify.
 */
const SOURCES = [
  { origin: ImageOrigin.OPEN_FOOD_FACTS, name: 'Open Food Facts', base: 'https://world.openfoodfacts.org' },
  { origin: ImageOrigin.OPEN_BEAUTY_FACTS, name: 'Open Beauty Facts', base: 'https://world.openbeautyfacts.org' },
  { origin: ImageOrigin.OPEN_PRODUCTS_FACTS, name: 'Open Products Facts', base: 'https://world.openproductsfacts.org' }
];
const LICENSE = 'CC BY-SA 3.0 (images) / ODbL (data)';
const FIELDS = 'code,product_name,product_name_en,generic_name,brands,quantity,image_front_url,image_url';

// The Open*Facts APIs limit product reads per IP; keep one request per 1.5 s per host, and back off on HTTP 429.
const MIN_INTERVAL_MS = 1500;
const MAX_RETRIES = 3;
const lastCall = new Map();
async function throttle(host) {
  const wait = (lastCall.get(host) || 0) + MIN_INTERVAL_MS - Date.now();
  lastCall.set(host, Date.now() + Math.max(wait, 0));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

function lookupEnabled() {
  return env.PRODUCT_LOOKUP_ENABLED;
}

/** Queries one source. Returns a normalised record, null when the barcode is unknown there; throws on network errors. */
async function querySource(source, barcode) {
  let res;
  for (let attempt = 0; ; attempt += 1) {
    await throttle(source.base);
    res = await fetch(`${source.base}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: { 'User-Agent': env.PRODUCT_LOOKUP_USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.status !== 429 || attempt >= MAX_RETRIES) break;
    // Rate limited: wait as asked (Retry-After seconds) or 20 s, 40 s, 60 s, and hold back other requests to this host.
    const wait = (Number(res.headers.get('retry-after')) || 20 * (attempt + 1)) * 1000;
    lastCall.set(source.base, Date.now() + wait);
    await new Promise((r) => setTimeout(r, wait));
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${source.name} responded ${res.status}`);
  const body = await res.json();
  const p = body && body.status === 1 ? body.product : null;
  // Accept only a record for exactly this barcode (the API may normalise leading zeros).
  if (!p || String(p.code || '').replace(/^0+/, '') !== barcode.replace(/^0+/, '')) return null;
  const name = p.product_name || p.product_name_en || p.generic_name || '';
  return {
    origin: source.origin,
    sourceName: source.name,
    barcode,
    name: String(name).trim(),
    brand: String(p.brands || '').trim(),
    quantity: String(p.quantity || '').trim(),
    imageUrl: p.image_front_url || p.image_url || null,
    sourceUrl: `${source.base}/product/${encodeURIComponent(barcode)}`,
    license: LICENSE,
    attribution: `${source.name} contributors`
  };
}

/**
 * Looks a barcode up in each source in turn and returns every record found (the first with an image is
 * usually enough). Only valid GTIN-8/12/13/14 codes are looked up.
 */
async function lookupBarcode(barcode, { stopAtFirstImage = true } = {}) {
  const code = String(barcode || '').trim();
  if (!lookupEnabled()) throw new HttpError(503, 'External product lookup is turned off (PRODUCT_LOOKUP_ENABLED=false)', 'LOOKUP_DISABLED');
  if (!isValidGtin(code)) return { barcode: code, valid: false, results: [], errors: [] };
  const results = [];
  const errors = [];
  for (const source of SOURCES) {
    try {
      const found = await querySource(source, code);
      if (found) {
        results.push(found);
        if (stopAtFirstImage && found.imageUrl) break;
      }
    } catch (err) {
      errors.push(`${source.name}: ${err.message}`);
    }
  }
  return { barcode: code, valid: true, results, errors };
}

// ---------- Image download (approval caches the bytes in PMart) ----------

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Detects JPEG, PNG and WebP from the file's first bytes. Returns the MIME type or null. */
function sniffImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = address.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:');
}

/** Rejects anything but a public https URL (prevents the server being pointed at internal addresses). */
async function assertPublicHttpsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw badRequest('Enter a valid image URL', 'INVALID_URL');
  }
  if (url.protocol !== 'https:') throw badRequest('Image URLs must use https', 'INVALID_URL');
  const addresses = net.isIP(url.hostname) ? [{ address: url.hostname }] : await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (addresses.length === 0) throw badRequest('The image host could not be found', 'INVALID_URL');
  if (addresses.some((a) => isPrivateAddress(a.address))) throw badRequest('That image host is not allowed', 'INVALID_URL');
  return url;
}

/** Downloads an image (https only, ≤ 3 MB, JPEG/PNG/WebP verified by content). */
async function downloadImage(rawUrl) {
  // Follow at most three redirects, re-checking every hop so a redirect cannot reach an internal address.
  let target = rawUrl;
  let res;
  for (let hop = 0; hop < 4; hop += 1) {
    const url = await assertPublicHttpsUrl(target);
    res = await fetch(url, { headers: { 'User-Agent': env.PRODUCT_LOOKUP_USER_AGENT }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) break;
    if (hop === 3) throw badRequest('The image URL redirects too many times', 'IMAGE_DOWNLOAD_FAILED');
    target = new URL(location, url).toString();
  }
  if (!res.ok) throw badRequest(`The image could not be downloaded (HTTP ${res.status}). Upload the photo instead.`, 'IMAGE_DOWNLOAD_FAILED');
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_IMAGE_BYTES) throw badRequest('The image is larger than 3 MB', 'IMAGE_TOO_LARGE');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('The image is larger than 3 MB', 'IMAGE_TOO_LARGE');
  const contentType = sniffImageType(buffer);
  if (!contentType) throw badRequest('The URL did not return a JPEG, PNG or WebP image', 'NOT_AN_IMAGE');
  return { buffer, contentType };
}

module.exports = { SOURCES, lookupBarcode, downloadImage, sniffImageType, assertPublicHttpsUrl, MAX_IMAGE_BYTES };
