import * as assert from 'assert';
import { getGitDiff, getRepositoryPath } from '../git';

suite('Git Helper', () => {

  test('getRepositoryPath returns workspace path or null', () => {
    const repoPath = getRepositoryPath();

    assert.ok(
      repoPath === null || typeof repoPath === 'string'
    );
  });

  test('getGitDiff returns string if repository exists', async () => {
    const repoPath = getRepositoryPath();

    if (!repoPath) {
      return;
    }

    const diff = await getGitDiff(repoPath, true);
    assert.strictEqual(typeof diff, 'string');
  });

});
