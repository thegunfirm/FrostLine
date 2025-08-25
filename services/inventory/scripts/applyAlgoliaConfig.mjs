import { algoliasearch } from 'algoliasearch';
import { readFile } from 'node:fs/promises';

const appId = process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;
const indexName = process.env.ALGOLIA_INDEX;

if (!appId || !adminKey || !indexName) {
  console.error('Missing ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, or ALGOLIA_INDEX');
  process.exit(1);
}

const settings = await readFile('services/inventory/algolia/catalog/settings.json', 'utf8');
const rules = await readFile('services/inventory/algolia/catalog/rules.json', 'utf8');
const synonyms = await readFile('services/inventory/algolia/catalog/synonyms.json', 'utf8');

const base = `https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}`;
const headers = [
  '-H', `X-Algolia-Application-Id: ${appId}`,
  '-H', `X-Algolia-API-Key: ${adminKey}`,
  '-H', 'Content-Type: application/json'
];

const { execFileSync } = await import('node:child_process');

execFileSync('curl', ['-sS', '-X', 'PUT', ...headers, `${base}/settings`, '--data-binary', settings], { stdio: 'inherit' });
execFileSync('curl', ['-sS', '-X', 'POST', ...headers, `${base}/rules/batch`, '--data-binary', rules], { stdio: 'inherit' });
execFileSync('curl', ['-sS', '-X', 'POST', ...headers, `${base}/synonyms/batch`, '--data-binary', synonyms], { stdio: 'inherit' });

console.log('✅ Applied repo Algolia config to live index');