import appConfig from '../app.json';
import easConfig from '../eas.json';

describe('release configuration', () => {
  it('keeps the native identifiers aligned with App Store Connect', () => {
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.trainerhub.app');
    expect(appConfig.expo.android.package).toBe('com.trainerhub.app');
  });

  it('selects an explicit EAS environment for every build profile', () => {
    expect(easConfig.build.development.environment).toBe('development');
    expect(easConfig.build.preview.environment).toBe('preview');
    expect(easConfig.build['preview-sim'].environment).toBe('preview');
    expect(easConfig.build.production.environment).toBe('production');
  });

  it('does not commit service values into build profiles', () => {
    for (const profile of Object.values(easConfig.build)) {
      expect(profile).not.toHaveProperty('env');
    }
    expect(JSON.stringify(easConfig)).not.toContain('pk_live_');
    expect(JSON.stringify(easConfig)).not.toContain('.supabase.co');
  });
});
