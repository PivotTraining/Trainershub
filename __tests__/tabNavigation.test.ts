import fs from 'node:fs';
import path from 'node:path';

describe('native tab navigation hardening', () => {
  const repoRoot = path.resolve(__dirname, '..');

  // Inactive tabs MUST be detached and frozen. When these were disabled, every
  // visited tab stayed mounted and painted in the same space — Home rendered
  // through Discover after a single tab switch.
  it('detaches and freezes inactive tab screens', () => {
    const tabsLayout = fs.readFileSync(path.join(repoRoot, 'app/(tabs)/_layout.tsx'), 'utf8');
    expect(tabsLayout).not.toContain('detachInactiveScreens={false}');
    expect(tabsLayout).toMatch(/detachInactiveScreens(?!={false})/);
    expect(tabsLayout).toContain('freezeOnBlur: true');
  });

  it('switches mobile tabs with a tab jump action rather than generic navigate', () => {
    const tabBar = fs.readFileSync(path.join(repoRoot, 'components/TabBar.tsx'), 'utf8');
    expect(tabBar).toContain('navigation.dispatch(TabActions.jumpTo(route.name, route.params))');
    expect(tabBar).not.toContain('navigation.navigate(route.name as never)');
  });
});
