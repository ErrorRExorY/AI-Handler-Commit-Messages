import * as assert from 'assert';
import { buildPrompt } from '../prompt';

suite('Prompt Builder', () => {
  test('buildPrompt wraps git diff correctly', () => {
    const diff = 'diff --git a/a.txt b/a.txt';
    const result = buildPrompt(diff);

    assert.ok(result.startsWith('Git diff:'));
    assert.ok(result.includes(diff));
  });

  test('buildPrompt does not add instructions', () => {
    const diff = 'test';
    const result = buildPrompt(diff);

    assert.strictEqual(result, `Git diff:\n${diff}`);
  });
});
