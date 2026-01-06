import { exec } from 'child_process';
import * as vscode from 'vscode';

export function getGitDiff(repoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      'git diff --cached && git diff',
      { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout || 'No changes');
        }
      }
    );
  });
}

export function getRepositoryPath(): string | null {
  const workspace = vscode.workspace.workspaceFolders;
  return workspace?.[0]?.uri.fsPath ?? null;
}
