const { execFileSync } = require('node:child_process');

const ALLOWED_ADVISORIES = new Set([
  'GHSA-w3rx-r6r6-pgpr',
  'GHSA-5p2g-fcmc-qvqq',
]);

// Temporary exception: both advisories currently have no published patched
// image-size release and are reached through Expo/Metro build tooling.
// Force a human re-review instead of allowing this exception to live forever.
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

function advisoryIdsFromVia(via) {
  if (!via || typeof via === 'string') return [];
  const text = `${via.source || ''} ${via.url || ''} ${via.title || ''}`;
  return text.match(/GHSA-[a-z0-9-]+/gi) || [];
}

const report = audit();
const vulnerabilities = report.vulnerabilities || {};
const memo = new Map();

function isAllowedChain(name, visiting = new Set()) {
  if (memo.has(name)) return memo.get(name);
  if (visiting.has(name)) return false;

  const vulnerability = vulnerabilities[name];
  if (!vulnerability) return false;
  if (!['high', 'critical'].includes(vulnerability.severity)) return true;

  const nextVisiting = new Set(visiting);
  nextVisiting.add(name);

  let sawCause = false;
  for (const via of vulnerability.via || []) {
    sawCause = true;

    if (typeof via === 'string') {
      if (!isAllowedChain(via, nextVisiting)) {
        memo.set(name, false);
        return false;
      }
      continue;
    }

    const ids = advisoryIdsFromVia(via);
    if (ids.length === 0 || !ids.every((id) => ALLOWED_ADVISORIES.has(id))) {
      memo.set(name, false);
      return false;
    }
  }

  const allowed = sawCause && (name === 'image-size' || (vulnerability.via || []).every((via) => typeof via === 'string' ? isAllowedChain(via, nextVisiting) : advisoryIdsFromVia(via).every((id) => ALLOWED_ADVISORIES.has(id))));
  memo.set(name, allowed);
  return allowed;
}

const blocking = [];
const allowed = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;
  const ids = (vulnerability.via || []).flatMap(advisoryIdsFromVia);
  const item = { name, severity: vulnerability.severity, advisories: [...new Set(ids)] };
  if (isAllowedChain(name)) allowed.push(item);
  else blocking.push(item);
}

if (allowed.length > 0) {
  console.warn('Temporary approved security exception chain:');
  for (const item of allowed) console.warn(`- ${item.name} (${item.severity}) ${item.advisories.join(', ')}`);
  console.warn(`Mandatory exception review deadline: ${EXCEPTION_REVIEW_BY.toISOString()}`);
}

if (Date.now() >= EXCEPTION_REVIEW_BY.getTime() && allowed.length > 0) {
  console.error('Security exception review deadline has passed. Re-review before releasing.');
  process.exit(1);
}

if (blocking.length > 0) {
  console.error('Blocking high/critical production dependency vulnerabilities found:');
  for (const item of blocking) console.error(`- ${item.name} (${item.severity}) ${item.advisories.join(', ')}`);
  process.exit(1);
}

console.log('Production dependency security gate passed. No unapproved high/critical vulnerabilities found.');
