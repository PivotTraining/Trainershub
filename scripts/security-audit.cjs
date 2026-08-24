const { execFileSync } = require('node:child_process');

const ALLOWED_ADVISORIES = new Set([
  'GHSA-w3rx-r6r6-pgpr',
  'GHSA-5p2g-fcmc-qvqq',
]);

// These two image-size advisories currently have no published patched release.
// Metro reaches image-size through Expo build tooling. Re-review this exception
// frequently and remove it immediately once Expo/image-size provides a fix.
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
  const ids = new Set();
  for (const via of vulnerability.via || []) {
    if (!via || typeof via === 'string') continue;
    const haystack = `${via.source || ''} ${via.url || ''} ${via.title || ''}`;
    const matches = haystack.match(/GHSA-[a-z0-9-]+/gi) || [];
    for (const match of matches) ids.add(match);
  }
  return ids;
}

const report = audit();
const vulnerabilities = report.vulnerabilities || {};
const blocking = [];
const allowed = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;

  const ids = advisoryIds(vulnerability);
  const onlyKnownImageSizeIssue =
    name === 'image-size' &&
    ids.size > 0 &&
    [...ids].every((id) => ALLOWED_ADVISORIES.has(id));

  // npm can roll the parent dependency chain up as high because it ultimately
  // reaches image-size. Allow those parents only when every advisory object in
  // the chain points exclusively at the two known image-size advisories.
  const viaObjects = (vulnerability.via || []).filter((via) => via && typeof via !== 'string');
  const parentOnlyKnownIssue =
    viaObjects.length > 0 &&
    viaObjects.every((via) => {
      const text = `${via.source || ''} ${via.url || ''} ${via.title || ''}`;
      const matches = text.match(/GHSA-[a-z0-9-]+/gi) || [];
      return matches.length > 0 && matches.every((id) => ALLOWED_ADVISORIES.has(id));
    });

  if (onlyKnownImageSizeIssue || parentOnlyKnownIssue) {
    allowed.push({ name, severity: vulnerability.severity, advisories: [...ids] });
  } else {
    blocking.push({ name, severity: vulnerability.severity, advisories: [...ids] });
  }
}

if (allowed.length > 0) {
  console.warn('Allowed temporary security exceptions:');
  for (const item of allowed) console.warn(`- ${item.name} (${item.severity}) ${item.advisories.join(', ')}`);
  console.warn(`Exception review deadline: ${EXCEPTION_REVIEW_BY.toISOString()}`);
}

if (Date.now() >= EXCEPTION_REVIEW_BY.getTime() && allowed.length > 0) {
  console.error('Security exception review deadline has passed. Re-review the image-size advisories before releasing.');
  process.exit(1);
}

if (blocking.length > 0) {
  console.error('Blocking high/critical production dependency vulnerabilities found:');
  for (const item of blocking) console.error(`- ${item.name} (${item.severity}) ${item.advisories.join(', ')}`);
  process.exit(1);
}

console.log('Production dependency security gate passed. No unapproved high/critical vulnerabilities found.');
