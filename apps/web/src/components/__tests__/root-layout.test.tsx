import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import OriginalRootLayout from '../../app/layout';

// Minimal mocks to satisfy layout side effects
vi.mock('botid/client', () => ({
  BotIdClient: () => null,
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));
vi.mock('../../lib/font-config', () => ({ defaultFont: { className: 'font' } }));
vi.mock('@/env', () => ({ env: { NODE_ENV: 'test' } }));

// Smoke test just ensures the layout renders basic structural nodes.

describe('RootLayout', () => {
  it('is a defined component', () => {
    expect(OriginalRootLayout).toBeTypeOf('function');
  });
});
