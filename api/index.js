const algoliasearch = require('algoliasearch');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // --- Config ---
  const WEBFLOW_TOKEN = '7e14b75b3b16d3ade3884745770eee89a7904bd00dc54f6ecc7a9f8dcb8bc293';
  const COLLECTION_IDS = [
    '67f4cfa4121a779535ec534d', // Rolex single products
    '685172a36e0ea2ec8c738474', // Rolex single products 2
  ];
  const ALGOLIA_APP_ID = 'UJ858U3VBC';
  const ALGOLIA_ADMIN_KEY = '1199d5f3fd1bc4efec9cc1e5f093415a';
  const ALGOLIA_INDEX_NAME = 'webflow_products';

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

  // --- Fetch all items from a Webflow collection (paginated) ---
  async function fetchAllFromCollection(collectionId) {
    const allItems = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const url = `https://api.webflow.com/v2/collections/${collectionId}/items?limit=${limit}&offset=${offset}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${WEBFLOW_TOKEN}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch from collection ${collectionId}: ${res.statusText}`);
      const data = await res.json();
      allItems.push(...data.items);
      if (data.items.length < limit) break;
      offset += limit;
    }

    return allItems;
  }

  // --- Normalize items depending on their collection ---
  function normalize(items, collectionId) {
    return items.map(item => {
      const f = item.fieldData || {};

      let basePath = '/';
      if (collectionId === '67f4cfa4121a779535ec534d') {
        basePath = '/rolex-watches/';
      } else if (collectionId === '685172a36e0ea2ec8c738474') {
        basePath = '/rolex-single-products-2/';
      }

      return {
        objectID: item._id || item.id,
        name: f.name || f.title || 'Untitled',
        slug: f.slug || '',
        familyName: f.familyname || 'N/A',
        image: (f['image-3'] && f['image-3'].url) || '', 
        url: `${basePath}${f.slug || 'undefined'}`,
      };
    });
  }

  // --- Run sync ---
  try {
    let allFormatted = [];

    for (const id of COLLECTION_IDS) {
      const items = await fetchAllFromCollection(id);
      const normalized = normalize(items, id);
      allFormatted.push(...normalized);
    }

    await index.clearObjects(); // remove old records
    await index.saveObjects(allFormatted, { autoGenerateObjectIDIfNotExist: true });

    res.status(200).json({ message: `✅ Synced ${allFormatted.length} items to Algolia.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};