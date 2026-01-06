export function buildPrompt(diff: string): string {
  return `Git diff:\n${diff}`;
}