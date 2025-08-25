import { algoliasearch } from 'algoliasearch';
import { writeFile, mkdir } from 'node:fs/promises';

const appId = process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;
const indexName = process.env.ALGOLIA_INDEX;

if (!appId || !adminKey || !indexName) {
  console.error('Missing ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, or ALGOLIA_INDEX');
  process.exit(1);
}

const client = algoliasearch(appId, adminKey);
const index = client.initIndex(indexName);

// Export settings, rules, synonyms from the live index into versioned files
const [settings, rulesRes, synsRes] = await Promise.all([
  index.getSettings(),
  index.searchRules('', { hitsPerPage: 1000 }),
  index.searchSynonyms('', { hitsPerPage: 1000 }),
]);

await mkdir('services/inventory/algolia/catalog', { recursive: true });
await writeFile('services/inventory/algolia/catalog/settings.json', JSON.stringify(settings, null, 2));
await writeFile('services/inventory/algolia/catalog/rules.json', JSON.stringify(rulesRes.hits ?? [], null, 2));
await writeFile('services/inventory/algolia/catalog/synonyms.json', JSON.stringify(synsRes.hits ?? [], null, 2));

console.log('✅ Exported Algolia config to services/inventory/algolia/catalog/*');