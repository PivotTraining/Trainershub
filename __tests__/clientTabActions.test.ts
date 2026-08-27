import fs from 'node:fs';
import path from 'node:path';

describe('client tab button navigation', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('uses navigate for root-tab actions on the client home experience', () => {
    const source = fs.readFileSync(path.join(repoRoot, 'components/ClientHomeExperience.tsx'), 'utf8');
    expect(source).not.toContain("router.push('/(tabs)/browse')");
    expect(source).not.toContain("router.push('/(tabs)/profile-dashboard')");
    expect(source).toContain("router.navigate('/(tabs)/browse')");
    expect(source).toContain("router.navigate('/(tabs)/profile-dashboard')");
  });

  it('does not push the marketplace root from the find-match card', () => {
    const source = fs.readFileSync(path.join(repoRoot, 'components/FindMatchCard.tsx'), 'utf8');
    expect(source).not.toContain("router.push('/(tabs)/browse')");
    expect(source).toContain("router.navigate('/(tabs)/browse')");
  });
});
