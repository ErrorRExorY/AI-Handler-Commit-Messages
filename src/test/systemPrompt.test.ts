import * as assert from 'assert';
import { DEFAULT_SYSTEM_PROMPT } from '../defaultSystemPrompt';

suite('Default System Prompt', () => {
  test('contains critical rules', () => {
    assert.ok(DEFAULT_SYSTEM_PROMPT.includes('CRITICAL RULES'));
    assert.ok(DEFAULT_SYSTEM_PROMPT.includes('Conventional Commits'));
  });

  test('does not contain markdown fences', () => {
    assert.ok(!DEFAULT_SYSTEM_PROMPT.includes('```'));
  });

  test('is trimmed', () => {
    assert.strictEqual(
      DEFAULT_SYSTEM_PROMPT,
      DEFAULT_SYSTEM_PROMPT.trim()
    );
  });
});
