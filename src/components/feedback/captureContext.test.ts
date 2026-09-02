import { describe, it, expect } from 'vitest';
import { captureContext, defaultArea, APP_VERSION } from './captureContext';

describe('captureContext', () => {
  it('names the screen from the nav manifest, including nested routes', () => {
    const ctx = captureContext({ pathname: '/tech-log/defects', role: 'pilot' });
    expect(ctx.route).toBe('/tech-log/defects');
    expect(ctx.screen).not.toBe('Unknown screen');
    expect(ctx.role).toBe('pilot');
    expect(ctx.appVersion).toBe(APP_VERSION);
  });

  it('degrades honestly on a route the manifest does not know', () => {
    const ctx = captureContext({ pathname: '/not-a-real-route', role: 'admin' });
    expect(ctx.screen).toBe('Unknown screen');
    expect(defaultArea(ctx)).toBe('Other');
  });

  it('says unknown rather than inventing a viewport', () => {
    expect(captureContext({ pathname: '/', role: 'pilot' }).viewport).toBe('unknown');
    expect(
      captureContext({ pathname: '/', role: 'pilot', viewportWidth: 1180.4, viewportHeight: 820 })
        .viewport,
    ).toBe('1180x820');
  });
});

describe('viewport capture guards against a pre-layout read', () => {
  it('treats a zero-size window as unknown rather than reporting 0x0', () => {
    expect(
      captureContext({ pathname: '/', role: 'pilot', viewportWidth: 0, viewportHeight: 0 }).viewport,
    ).toBe('unknown');
  });
});
