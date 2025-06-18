const algoliasearch = require('algoliasearch');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const WEBFLOW_TOKEN = '0ccd999359fac14f8c01ac8b2516ed918863515cee4c3d184f02fd6d0419d9d4';
  const COLLECTION_IDS = [
    '64e76dbbe94dbbf00a71619e', // Our stories
    '64e76dbbe94dbbf00a716348', // Messika stories
    '64e76dbbe94dbbf00a716315', // Roberto Coin stories
    '64e76dbbe94dbbf00a716332', // Timepieces stories
    '64e76dbbe94dbbf00a716159', // Rolex single products
    '64e76dbbe94dbbf00a7161ec', // Tudor single products
    '64e76dbbe94dbbf00a716223', // Roberto Coin single articles
    '64e76dbbe94dbbf00a716240', // Messika single articles
    '64e76dbbe94dbbf00a7160e9', // Petrovic Diamonds single products
    '64e76dbbe94dbbf00a7162e0', // Swiss Kubik single articles
  ];

  const ALGOLIA_APP_ID = 'UJ858U3VBC';
  const ALGOLIA_ADMIN_KEY = '1199d5f3fd1bc4efec9cc1e5f093415a';
  const ALGOLIA_INDEX_NAME = 'webflow_products';

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

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

  function normalize(items, collectionId) {
    if (items.length > 0) {
      console.log(`🔍 Fields for first item in collection ${collectionId}:`);
      console.log(items[0].fieldData || {});
    }

    return items.map(item => {
      const f = item.fieldData || {};

      return {
        objectID: item._id || item.id,
        name: f.name || f.title || 'Untitled',
        slug: f.slug || '',
        familyName: f.familyname || f['family-name'] || 'N/A',
        image: (f['image-3'] && f['image-3'].url) || (f['main-image'] && f['main-image'].url) || '',
        url: `/${f.slug || 'undefined'}`,
      };
    });
  }

  try {
    let allFormatted = [];

    for (const id of COLLECTION_IDS) {
      const items = await fetchAllFromCollection(id);
      const normalized = normalize(items, id);
      allFormatted.push(...normalized);
    }

    await index.clearObjects();
    await index.saveObjects(allFormatted, { autoGenerateObjectIDIfNotExist: true });

    res.status(200).json({ message: `✅ Synced ${allFormatted.length} items to Algolia.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};