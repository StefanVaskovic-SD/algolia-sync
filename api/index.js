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
    let basePath = '/';
    switch (collectionId) {
      case '64e76dbbe94dbbf00a716159':
        basePath = '/rolex-watches/';
        break;
      case '64e76dbbe94dbbf00a7161ec':
        basePath = '/tudor/';
        break;
      case '64e76dbbe94dbbf00a7160e9':
        basePath = '/petrovic-diamonds/';
        break;
      case '64e76dbbe94dbbf00a716223':
        basePath = '/roberto-coin/';
        break;
      case '64e76dbbe94dbbf00a716240':
        basePath = '/messika/';
        break;
      case '64e76dbbe94dbbf00a7162e0':
        basePath = '/swiss-kubik/';
        break;
      case '64e76dbbe94dbbf00a71619e':
        basePath = '/our-stories/';
        break;
      case '64e76dbbe94dbbf00a716348':
        basePath = '/messika-stories/';
        break;
      case '64e76dbbe94dbbf00a716315':
        basePath = '/roberto-coin-stories/';
        break;
      case '64e76dbbe94dbbf00a716332':
        basePath = '/timepieces-story/';
        break;
    }

    return items.map(item => {
      const f = item.fieldData || {};

      let image = '';
      if (collectionId === '64e76dbbe94dbbf00a71619e') {
        image = f.imge?.url || '';
      } else if (collectionId === '64e76dbbe94dbbf00a716348') {
        image = f['hero-background-image']?.url || '';
      } else if (collectionId === '64e76dbbe94dbbf00a716315') {
        image = f.imge?.url || '';
      } else if (collectionId === '64e76dbbe94dbbf00a716332') {
        image = f['large-image-watch-image']?.url || '';
      } else {
        image = f['grid-image']?.url || '';
      }

      let familyName = '';
      if (collectionId === '64e76dbbe94dbbf00a716159') {
        familyName = f.familyname;
      } else if (collectionId === '64e76dbbe94dbbf00a7161ec') {
        familyName = f['item-name'] || '';
      } else if (collectionId === '64e76dbbe94dbbf00a7160e9') {
        familyName = f['item-name'] || '';
      } else if (collectionId === '64e76dbbe94dbbf00a716240') {
        familyName = f['item-name'] || '';
      } else {
        familyName = '';
      }
      

      return {
        objectID: item._id || item.id,
        name: f.name || f.title || 'Untitled',
        slug: f.slug || '',
        familyName,
        image,
        url: `${basePath}${f.slug || 'undefined'}`,
      };
    });
  }

  try {
    let allFormatted = [];

    for (const id of COLLECTION_IDS) {
      const items = await fetchAllFromCollection(id);
      const publishedItems = items.filter(item => !item.isDraft); // ✅ filter out drafts
      const normalized = normalize(publishedItems, id);
      allFormatted.push(...normalized);
    }

    await index.clearObjects();
    await index.saveObjects(allFormatted, { autoGenerateObjectIDIfNotExist: true });

    res.status(200).json({ message: `✅ Synced ${allFormatted.length} items to Algolia.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};