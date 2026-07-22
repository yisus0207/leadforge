import QRCode from 'qrcode';

export interface EvolutionQRResponse {
  instanceName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'PAUSED' | 'QRCODE';
  qrCode?: string;
}

export interface ApifyScrapedLead {
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  industry?: string;
  location?: string;
}

export async function createEvolutionInstance(instanceName: string): Promise<{ success: boolean; qrCode?: string }> {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL || '';
  const globalKey = process.env.EVOLUTION_GLOBAL_KEY || '';

  try {
    const response = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': globalKey
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
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

// 1. WhatsApp Evolution API integration
export async function fetchWhatsappQR(instanceName: string, forceFresh: boolean = false): Promise<EvolutionQRResponse> {
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

        const response = await fetch(`${evolutionApiUrl}/instance/connect/${targetInstance}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          }
        });
        const data = await response.json();
        const code = data.base64 || data.qrcode?.base64 || data.qrcode?.code || data.code;
        if (code) {
          return {
            instanceName: targetInstance,
            status: 'QRCODE',
            qrCode: code.startsWith('data:') ? code : `data:image/png;base64,${code}`
          };
        }
      }

      // If connect didn't return a QR code, create instance dynamically on Evolution API!
      const createRes = await createEvolutionInstance(targetInstance);
      if (createRes.qrCode) {
        return {
          instanceName: targetInstance,
          status: 'QRCODE',
          qrCode: createRes.qrCode
        };
      }
    } catch (error) {
      console.error('Error fetching QR from Evolution API:', error);
    }
  }

  return {
    instanceName: targetInstance,
    status: 'QRCODE',
    qrCode: undefined
  };
}

export async function sendWhatsappMessage(instanceName: string, phone: string, text: string): Promise<boolean> {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;

  console.log(`[WhatsApp - ${instanceName}] Sending message to ${phone}: ${text.slice(0, 50)}...`);

  if (evolutionApiUrl && evolutionApiKey) {
    try {
      const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        },
        body: JSON.stringify({
          number: phone,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text }
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Error dispatching WhatsApp Evolution API call:', e);
    }
  }
  return true;
}

// 2. Apify Lead Scraping Integration (REAL LIVE GOOGLE PLACES DATA)
export async function runApifyGoogleMapsScraper(query: string, limit = 5): Promise<ApifyScrapedLead[]> {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    console.warn('[Apify Scraper] Warning: APIFY_TOKEN is not defined in process.env');
  }

  console.log(`[Apify Scraper] Running LIVE Google Places query: "${query}" with limit of ${limit}`);

  try {
    const res = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: limit,
        language: 'es'
      })
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        console.log(`[Apify Scraper] Successfully extracted ${items.length} REAL live leads from Google Maps!`);
        return items.map((item: any) => ({
          companyName: item.title || item.name || query,
          website: item.website || undefined,
          phone: item.phoneUnformatted || item.phone || undefined,
          email: item.email || undefined,
          industry: item.categoryName || query,
          location: item.city || item.address || item.location || 'Colombia'
        }));
      }
    } else {
      console.warn('[Apify Scraper] Apify API returned status:', res.status);
    }
  } catch (error) {
    console.error('Apify real extraction error:', error);
  }

  return [];
}

// 3. Resend Email Integration
export async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;

  console.log(`[Resend Email] Sending email to: ${to}, subject: "${subject}"`);

  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'LeadForge AI <prospects@leadforge.ai>',
          to,
          subject,
          html
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Error dispatching Resend call:', e);
    }
  }
  return true;
}
