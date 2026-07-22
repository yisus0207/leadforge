const QRCode = require('qrcode');

async function createEvolutionInstance(instanceName) {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL || '';
  const globalKey = process.env.EVOLUTION_GLOBAL_KEY || '';
  try {
    const response = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': globalKey },
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
    });
    const data = await response.json();
    const code = data.base64 || data.qrcode?.base64 || data.qrcode?.code || data.code;
    return {
      success: response.status === 201 || response.status === 200,
      qrCode: code ? (code.startsWith('data:') ? code : `data:image/png;base64,${code}`) : undefined
    };
  } catch (err) {
    console.error('Error creating Evolution API instance:', err);
    return { success: false };
  }
}

async function fetchWhatsappQR(instanceName, forceFresh = false) {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL || '';
  const instanceApiKey = process.env.EVOLUTION_API_KEY || '';
  const globalApiKey = process.env.EVOLUTION_GLOBAL_KEY || '';
  const targetInstance = (instanceName && instanceName !== 'undefined') ? instanceName : 'GestiBot';

  if (evolutionApiUrl) {
    try {
      for (const apiKey of [globalApiKey, instanceApiKey]) {
        if (forceFresh) {
          await fetch(`${evolutionApiUrl}/instance/logout/${targetInstance}`, {
            method: 'DELETE',
            headers: { 'apikey': apiKey }
          }).catch(() => { });
        }

        const fetchRes = await fetch(`${evolutionApiUrl}/instance/connect/${targetInstance}`, {
          method: 'GET',
          headers: { 'apikey': apiKey }
        });

        if (fetchRes.ok) {
          const data = await fetchRes.json();
          const code = data.base64 || data.qrcode?.base64 || data.qrcode?.code || data.code || data.count;
          
          if (data.instance?.state === 'open' || data.status === 'CONNECTED' || data.state === 'open') {
            return { instanceName: targetInstance, status: 'CONNECTED' };
          }

          if (code) {
            const formatted = code.startsWith('data:') ? code : `data:image/png;base64,${code}`;
            return { instanceName: targetInstance, status: 'QRCODE', qrCode: formatted };
          }
        }
      }
    } catch (err) {
      console.error('Error connecting to Evolution API:', err);
    }
  }

  const generatedQR = await QRCode.toDataURL(`whatsapp://connect?instance=${targetInstance}&t=${Date.now()}`);
  return { instanceName: targetInstance, status: 'QRCODE', qrCode: generatedQR };
}

async function runApifyGoogleMapsScraper(searchTerms, location = 'Bogota, Colombia', maxResults = 10) {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  try {
    const response = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchStringsArray: Array.isArray(searchTerms) ? searchTerms : [searchTerms],
        locationQuery: location,
        maxCrawledPlacesPerSearch: maxResults
      })
    });

    if (!response.ok) return [];
    const items = await response.json();
    return items.map((item) => ({
      companyName: item.title || item.name || 'Empresa Desconocida',
      website: item.website || item.url || '',
      phone: item.phone || item.phoneUnformatted || '',
      email: item.email || (item.emails && item.emails[0]) || '',
      industry: item.categoryName || searchTerms,
      location: item.city || item.address || location
    }));
  } catch (err) {
    console.error('Apify Scraping Error:', err);
    return [];
  }
}

module.exports = {
  createEvolutionInstance,
  fetchWhatsappQR,
  runApifyGoogleMapsScraper
};
