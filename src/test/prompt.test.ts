import * as assert from 'assert';
import { buildPrompt } from '../prompt';

suite('Prompt Builder', () => {

  test('buildPrompt includes user input', () => {
    const result = buildPrompt('Hello World');
    assert.ok(result.includes('Hello World'));
  });

  test('buildPrompt produces non-empty prompt', () => {
    const result = buildPrompt('test');
    assert.ok(result.length > 10);
  });

});
