import { describe, expect, it } from 'vitest';
import { extensionMessageSchema } from '../../src/storage/schema';
import { node, settings } from './fixtures';

describe('extensionMessageSchema', () => {
  it('accepts supported typed messages', () => {
    expect(extensionMessageSchema.safeParse({ type: 'SET_MODE', mode: 'rule' }).success).toBe(true);
    expect(extensionMessageSchema.safeParse({ type: 'ADD_NODE', node }).success).toBe(true);
    expect(extensionMessageSchema.safeParse({ type: 'SAVE_SETTINGS', settings }).success).toBe(
      true,
    );
  });

  it('rejects invalid modes and malformed node ports', () => {
    expect(extensionMessageSchema.safeParse({ type: 'SET_MODE', mode: 'auto' }).success).toBe(
      false,
    );
    expect(
      extensionMessageSchema.safeParse({ type: 'ADD_NODE', node: { ...node, port: 70000 } })
        .success,
    ).toBe(false);
  });

  it('rejects unknown message types', () => {
    expect(
      extensionMessageSchema.safeParse({ type: 'EXECUTE_SCRIPT', code: 'alert(1)' }).success,
    ).toBe(false);
  });
});
