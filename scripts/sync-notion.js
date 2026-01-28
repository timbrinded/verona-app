const fs = require('fs');
const https = require('https');

const NOTION_API_KEY = process.env.NOTION_API_KEY || fs.readFileSync(
  require('os').homedir() + '/.config/notion/api_key', 'utf8'
).trim();
const DATABASE_ID = '20ab404b-c4cd-4bd6-bd99-1c887113a06b';

async function fetchNotion(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function syncPlaces() {
  console.log('Fetching places from Notion...');
  
  const response = await fetchNotion(
    `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
    { body: JSON.stringify({}) }
  );
  
  const places = response.results.map(page => {
    const props = page.properties;
    
    const getText = (prop) => {
      if (!prop) return '';
      if (prop.title) return prop.title[0]?.plain_text || '';
      if (prop.rich_text) return prop.rich_text[0]?.plain_text || '';
      return '';
    };
    
    const getSelect = (prop) => prop?.select?.name || '';
    const getNumber = (prop) => prop?.number || 0;
    const getUrl = (prop) => prop?.url || '';
    
    return {
      id: page.id,
      name: getText(props.Name),
      category: getSelect(props.Category),
      rating: getNumber(props.Rating),
      reviews: getNumber(props.Reviews),
      price: getSelect(props.Price),
      distance: getNumber(props.Distance),
      vibe: getNumber(props.Vibe),
      confidence: getNumber(props.Confidence),
      address: getText(props.Address),
      phone: props.Phone?.phone_number || '',
      website: getUrl(props.Website),
      googleMaps: getUrl(props['Google Maps']),
      booking: getUrl(props.Booking),
      notes: getText(props.Notes),
    };
  });
  
  // Write to public folder for static access
  fs.mkdirSync('public/data', { recursive: true });
  fs.writeFileSync('public/data/places.json', JSON.stringify(places, null, 2));
  
  console.log(`✓ Synced ${places.length} places to public/data/places.json`);
  
  // Group by category for quick stats
  const categories = {};
  places.forEach(p => {
    categories[p.category] = (categories[p.category] || 0) + 1;
  });
  console.log('Categories:', categories);
}

syncPlaces().catch(console.error);
