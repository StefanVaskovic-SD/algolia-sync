const algoliasearch = require('algoliasearch');

// --- Config ---
const WEBFLOW_TOKEN = '7e14b75b3b16d3ade3884745770eee89a7904bd00dc54f6ecc7a9f8dcb8bc293';
const COLLECTION_ID = '67f4cfa4121a779535ec534d'; // Rolex single products
const ALGOLIA_APP_ID = 'UJ858U3VBC';
const ALGOLIA_ADMIN_KEY = '1199d5f3fd1bc4efec9cc1e5f093415a';
const ALGOLIA_INDEX_NAME = 'webflow_products';

// --- Algolia setup ---
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex(ALGOLIA_INDEX_NAME);

// --- Fetch all items from Webflow (paginated) ---
async function fetchAllItems() {
  const allItems = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${WEBFLOW_TOKEN}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch items: ${res.statusText}`);
    }

    const data = await res.json();
    allItems.push(...data.items);

    if (data.items.length < limit) break;
    offset += limit;
  }

  console.log(`📦 Fetched ${allItems.length} items from Webflow.`);
  return allItems;
}

// --- Normalize Webflow item format for Algolia ---
function normalize(items) {
  return items.map(item => {
    const f = item.fieldData;

    return {
      objectID: item._id || item.id,
      name: f.name || 'Untitled',
      slug: f.slug || '',
      familyName: f.familyname || 'N/A',
      url: `/rolex-watches/${f.slug || 'undefined'}`,
    };
  });
}

// --- Main sync function ---
async function pushToAlgolia() {
  const items = await fetchAllItems();
  const formatted = normalize(items);
  await index.clearObjects(); // 🔥 Remove old records to avoid duplicates
  await index.saveObjects(formatted, {
    autoGenerateObjectIDIfNotExist: true,
  });
  console.log(`✅ Synced ${formatted.length} Rolex products to Algolia.`);
}

// --- Run it ---
pushToAlgolia().catch(err => {
  console.error('❌ Sync failed:', err.message);
});