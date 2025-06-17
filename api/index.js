module.exports = async (req, res) => {
  const algoliasearch = require('algoliasearch');
  const fetch = require('node-fetch');

  // --- Config ---
  const WEBFLOW_TOKEN = '7e14b75b3b16d3ade3884745770eee89a7904bd00dc54f6ecc7a9f8dcb8bc293';
  const COLLECTION_ID = '67f4cfa4121a779535ec534d';
  const ALGOLIA_APP_ID = 'UJ858U3VBC';
  const ALGOLIA_ADMIN_KEY = '1199d5f3fd1bc4efec9cc1e5f093415a';
  const ALGOLIA_INDEX_NAME = 'webflow_products';

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

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

      if (!res.ok) throw new Error(`Failed to fetch items: ${res.statusText}`);
      const data = await res.json();
      allItems.push(...data.items);
      if (data.items.length < limit) break;
      offset += limit;
    }

    return allItems;
  }

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

  try {
    const items = await fetchAllItems();
    const formatted = normalize(items);
    await index.clearObjects();
    await index.saveObjects(formatted, { autoGenerateObjectIDIfNotExist: true });
    res.status(200).json({ message: `Synced ${formatted.length} items` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};