import '@testing-library/jest-dom/vitest';

const memory: Record<string, unknown> = {};

Object.defineProperty(globalThis, 'chrome', {
  configurable: true,
  value: {
    storage: {
      local: {
        get: async (keys?: string | string[]) => {
          if (!keys) return { ...memory };
          const list = typeof keys === 'string' ? [keys] : keys;
          return Object.fromEntries(list.map((key) => [key, memory[key]]));
        },
        set: async (items: Record<string, unknown>) => Object.assign(memory, items),
      },
    },
  },
});
