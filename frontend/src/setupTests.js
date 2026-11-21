// Adds matchers like toBeInTheDocument() and cleans the DOM between tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no ResizeObserver, which the Radix dropdown uses to position itself.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});
