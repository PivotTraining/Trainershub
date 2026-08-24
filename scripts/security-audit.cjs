const { execFileSync } = require('node:child_process');

const ALLOWED_ADVISORIES = new Set([
  'GHSA-w3rx-r6r6-pgpr',
  'GHSA-5p2g-fcmc-qvqq',
]);

const ALLOWED_CHAIN_PACKAGES = new Set([
  'image-size',
  '@expo/cli',
  '@expo/metro',
  '@expo/metro-config',
  'expo',
  'metro',
  'metro-config',
  'metro-transform-worker',
]);

// Temporary exception: both advisories currently have no published patched
// image-size release and are reached through Expo/Metro build tooling.
// This deadline intentionally forces a fresh security review.
const EXCEPTION_REVIEW_BY = new Date('2026-09-15T00:00:00Z');

function audit() {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' }));
  } catch (error) {
    const stdout = error && typeof error.stdout === 'string' ? error.stdout : '';
    if (!stdout) throw error;
    return JSON.parse(stdout);
  }
}

function advisoryIds(vulnerability) {
  const ids = [];
  for (const via of vulnerability.via || []) {
    if (!via || typeof via === 'string') continue;
    const text = `${via.source || ''} ${via.url || ''} ${via.title || ''}`;
    ids.push(...(text.match(/GHSA-[a-z0-9-]+/gi) || []));
  }
  return [...new Set(ids)];
}

const report = audit();
const vulnerabilities = report.vulnerabilities || {};
const blocking = [];
const allowed = [];

const imageSize = vulnerabilities['image-size'];
const imageSizeIds = imageSize ? advisoryIds(imageSize) : [];
const imageSizeExceptionIsExact =
  imageSize &&
  imageSize.severity === 'high' &&
  imageSizeIds.length === ALLOWED_ADVISORIES.size &&
  imageSizeIds.every((id) => ALLOWED_ADVISORIES.has(id));

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;

  const item = { name, severity: vulnerability.severity, advisories: advisoryIds(vulnerability) };
  const isKnownRollup =
    imageSizeExceptionIsExact &&
    vulnerability.severity === 'high' &&
    ALLOWED_CHAIN_PACKAGES.has(name);

  if (isKnownRollup) allowed.push(item);
  else blocking.push(item);
}

if (allowed.length > 0) {
  console.warn('Temporary approved Expo/Metro security exception chain:');
  for (const item of allowed) console.warn(`- ${item.name} (${item.severity}) ${item.advisories.join(', ')}`);
  console.warn(`Root advisories: ${imageSizeIds.join(', ')}`);
  console.warn(`Mandatory exception review deadline: ${EXCEPTION_REVIEW_BY.toISOString()}`);
}

if (allowed.length > 0 && Date.now() >= EXCEPTION_REVIEW_BY.getTime()) {
  console.error('Security exception review deadline has passed. Re-review before releasing.');
  process.exit(1);
}

if (blocking.length > 0) {
  console.error('Blocking high/critical production dependency vulnerabilities found:');
  for (const item of blocking) console.error(`- ${item.name} (${item.severity}) ${item.advisories.join(', ')}`);
  process.exit(1);
}

console.log('Production dependency security gate passed. No unapproved high/critical vulnerabilities found.');
