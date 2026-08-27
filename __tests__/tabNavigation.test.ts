import fs from 'node:fs';
import path from 'node:path';

describe('native tab navigation hardening', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('does not freeze or detach inactive tab screens', () => {
    const tabsLayout = fs.readFileSync(path.join(repoRoot, 'app/(tabs)/_layout.tsx'), 'utf8');
    expect(tabsLayout).toContain('detachInactiveScreens={false}');
    expect(tabsLayout).toContain('freezeOnBlur: false');
  });

  it('switches mobile tabs with a tab jump action rather than generic navigate', () => {
    const tabBar = fs.readFileSync(path.join(repoRoot, 'components/TabBar.tsx'), 'utf8');
    expect(tabBar).toContain('navigation.dispatch(TabActions.jumpTo(route.name, route.params))');
    expect(tabBar).not.toContain('navigation.navigate(route.name as never)');
  });
});
