export async function requestNewPublicApiKey(): Promise<string> {
  const response = await fetch(
    'https://ws.shortn.cloud/public/register',
    { method: 'POST' }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Key regeneration failed: ${text}`);
  }

  const json = JSON.parse(text);

  if (!json.apiKey || typeof json.apiKey !== 'string') {
    throw new Error('Invalid API key response from backend');
  }

  return json.apiKey;
}
