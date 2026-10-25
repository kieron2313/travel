import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// SerpApi Key
const SERPAPI_KEY = process.env.SERPAPI_KEY || '84faa340b40e597803a998277fb61af1e7f8c60c9aeb798422fe905013c71a45';
const SERPAPI_BASE = 'https://serpapi.com';

// Gemini SDK Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory Quota & Usage Tracker for Gemini
interface GeminiUsageState {
  todayDate: string;
  requestsUsedToday: number;
  totalTokensUsed: number;
  promptTokensUsed: number;
  candidatesTokensUsed: number;
  requestsInCurrentMinute: number;
  currentMinuteWindow: number;
  lastUsedTimestamp: string | null;
}

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

const geminiUsage: GeminiUsageState = {
  todayDate: getTodayDateStr(),
  requestsUsedToday: 0,
  totalTokensUsed: 0,
  promptTokensUsed: 0,
  candidatesTokensUsed: 0,
  requestsInCurrentMinute: 0,
  currentMinuteWindow: Math.floor(Date.now() / 60000),
  lastUsedTimestamp: null,
};

function recordGeminiCall(usage?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }) {
  const today = getTodayDateStr();
  if (geminiUsage.todayDate !== today) {
    geminiUsage.todayDate = today;
    geminiUsage.requestsUsedToday = 0;
  }

  geminiUsage.requestsUsedToday += 1;
  geminiUsage.lastUsedTimestamp = new Date().toISOString();

  const nowMin = Math.floor(Date.now() / 60000);
  if (geminiUsage.currentMinuteWindow !== nowMin) {
    geminiUsage.currentMinuteWindow = nowMin;
    geminiUsage.requestsInCurrentMinute = 1;
  } else {
    geminiUsage.requestsInCurrentMinute += 1;
  }

  if (usage) {
    geminiUsage.promptTokensUsed += usage.promptTokenCount || 0;
    geminiUsage.candidatesTokensUsed += usage.candidatesTokenCount || 0;
    geminiUsage.totalTokensUsed += usage.totalTokenCount || 0;
  }
}

// Cached SerpApi Account info to avoid rapid hammering
let cachedSerpApiAccount: any = null;
let lastSerpApiFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

async function fetchSerpApiAccountInfo() {
  const now = Date.now();
  if (cachedSerpApiAccount && now - lastSerpApiFetchTime < CACHE_TTL_MS) {
    return cachedSerpApiAccount;
  }

  try {
    const res = await fetch(`${SERPAPI_BASE}/account?api_key=${encodeURIComponent(SERPAPI_KEY)}`);
    if (!res.ok) {
      throw new Error(`SerpApi Account check error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    cachedSerpApiAccount = data;
    lastSerpApiFetchTime = now;
    return data;
  } catch (err: any) {
    console.warn('Could not fetch live SerpApi account:', err.message);
    if (cachedSerpApiAccount) return cachedSerpApiAccount;
    return null;
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Quota Info Endpoint: Returns both SerpApi and Gemini quotas
app.get('/api/quota', async (_req: Request, res: Response) => {
  const today = getTodayDateStr();
  if (geminiUsage.todayDate !== today) {
    geminiUsage.todayDate = today;
    geminiUsage.requestsUsedToday = 0;
  }

  const serpData = await fetchSerpApiAccountInfo();

  const serpApiQuota = serpData
    ? {
        status: (serpData.total_searches_left ?? 0) > 0 ? 'active' : 'exhausted',
        accountEmail: serpData.account_email || 'wdsolutionnet@gmail.com',
        planName: serpData.plan_name || 'Free Plan',
        totalSearches: serpData.searches_per_month ?? 250,
        searchesLeft: serpData.total_searches_left ?? serpData.plan_searches_left ?? 250,
        searchesUsedThisMonth: serpData.this_month_usage ?? 0,
        searchesUsedThisHour: serpData.this_hour_searches ?? 0,
        hourlyLimit: serpData.account_rate_limit_per_hour ?? 250,
        renewalDate: serpData.plan_renewal_date || 'Monthly',
        lastUpdated: new Date(lastSerpApiFetchTime || Date.now()).toISOString(),
      }
    : {
        status: 'active',
        accountEmail: 'wdsolutionnet@gmail.com',
        planName: 'Free Plan',
        totalSearches: 250,
        searchesLeft: 250,
        searchesUsedThisMonth: 0,
        searchesUsedThisHour: 0,
        hourlyLimit: 250,
        renewalDate: 'Monthly',
        lastUpdated: new Date().toISOString(),
      };

  const GEMINI_DAILY_LIMIT = 1500;
  const GEMINI_RPM_LIMIT = 15;

  const geminiQuota = {
    status: 'operational',
    dailyLimit: GEMINI_DAILY_LIMIT,
    requestsUsedToday: geminiUsage.requestsUsedToday,
    requestsLeftToday: Math.max(0, GEMINI_DAILY_LIMIT - geminiUsage.requestsUsedToday),
    totalTokensUsed: geminiUsage.totalTokensUsed,
    promptTokensUsed: geminiUsage.promptTokensUsed,
    candidatesTokensUsed: geminiUsage.candidatesTokensUsed,
    rpmLimit: GEMINI_RPM_LIMIT,
    requestsInCurrentMinute: geminiUsage.requestsInCurrentMinute,
    model: 'gemini-3.8-flash',
    lastUsed: geminiUsage.lastUsedTimestamp,
  };

  return res.json({
    serpApi: serpApiQuota,
    gemini: geminiQuota,
    summary: {
      searchesLeft: serpApiQuota.searchesLeft,
      searchesTotal: serpApiQuota.totalSearches,
      geminiRequestsLeft: geminiQuota.requestsLeftToday,
      geminiDailyLimit: geminiQuota.dailyLimit,
    },
  });
});

// 2. Geocode / City Lookup Endpoint
app.post('/api/gemini/geocode', async (req: Request, res: Response) => {
  const { lat, lon } = req.body;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ error: 'lat and lon numbers required' });
  }

  const prompt = `Identify the major city name located at or nearest to these coordinates: Latitude ${lat}, Longitude ${lon}. Return ONLY the city name (e.g., "London", "New York", "Tokyo"). Do not add country, state, or any extra text.`;

  // Try primary model with fallback
  const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      recordGeminiCall(response.usageMetadata);
      return res.json({ city: response.text ? response.text.trim() : '' });
    } catch (err: any) {
      console.warn(`Geocode attempt with ${model} failed:`, err?.status || err?.message);
    }
  }

  return res.json({ city: '' });
});

// Helper to clean JSON markdown wrappers
const cleanJson = (text: string): string => {
  if (!text) return '';
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return clean;
};

// 3. Generate Trip Suggestions Endpoint
app.post('/api/gemini/generate-trips', async (req: Request, res: Response) => {
  const params = req.body;

  if (!params || !params.origin || !params.startDate || !params.endDate || !params.duration) {
    return res.status(400).json({ error: 'Invalid search parameters' });
  }

  // Validate Search Window
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < params.duration) {
    return res.status(400).json({
      error: `Your search window (${diffDays} days) is shorter than your desired trip duration (${params.duration} days). Please extend the 'Until' date.`,
    });
  }

  const destinationContext =
    params.destination && params.destination.trim() !== ''
      ? `Specific Destination Requested: ${params.destination}. Suggest trips to this location or specific cities/regions within it.`
      : `Destination: ANYWHERE. The user is open to suggestions. You MUST suggest diverse destinations across different countries and continents. Do not limit to one region.`;

  const accTypes =
    params.accommodations && params.accommodations.length > 0
      ? params.accommodations.join(', ')
      : 'Any (Hotel, Hostel, Airbnb, etc.)';

  const accInstruction =
    params.accommodations && params.accommodations.length > 0
      ? `STRICTLY LIMIT suggestions to these types: ${accTypes}. Do NOT include other types.`
      : 'Suggest a mix of accommodation types.';

  const distanceInstruction = params.maxDistanceFromCenter
    ? `ACCOMMODATION LOCATION: Strictly prioritize accommodations within ${params.maxDistanceFromCenter}km of the city center.`
    : '';

  const today = new Date().toISOString().split('T')[0];

  const prompt = `
    Act as a world-class travel agent. I need you to plan a trip based on the following criteria:
    
    Current Date: ${today} (Today)
    Origin City: ${params.origin}
    ${destinationContext}
    
    SEARCH WINDOW:
    - User is available to travel between: ${params.startDate} and ${params.endDate}
    - Required Trip Duration: ${params.duration} Days
    
    Travelers: ${params.travelers} person(s)
    Total Budget: ${params.budget} ${params.currency} (This budget is for the WHOLE group of ${params.travelers})
    Preferred Accommodations: ${accTypes}
    ${distanceInstruction}
    Interests/Vibe: ${params.interests || 'General tourism'}

    Task:
    1. Suggest up to 4 DISTINCT trip destinations that strictly fit within the total budget.
    2. Sort them from CHEAPEST to most expensive.
    3. For each trip, provide a DETAILED breakdown.
    4. DATES: You MUST choose specific, valid start and end dates for a ${params.duration}-day trip that falls entirely within the "Search Window" (${params.startDate} to ${params.endDate}).
       - STRICT CONSTRAINT: The 'startDate' MUST be at least 3 days AFTER Today (${today}). Do NOT plan trips starting tomorrow or the day after.
    5. SEASONALITY: Briefly describe the travel season for this specific period (e.g. "Peak Season - Warm", "Shoulder Season - Mild").
    6. FLIGHTS: Provide specific costs for outbound and return flights separately based on these SPECIFIC chosen dates.
       - Provide 3 "Flexible Date" options for the OUTBOUND flight within the search window.
       - Provide 3 "Flexible Date" options for the RETURN flight within the search window.
    7. ACCOMMODATION: Provide a list of exactly 2 recommended accommodations suitable for ${params.travelers} people.
       - CRITICAL: ${accInstruction}
       - CRITICAL: Ensure coordinates are accurate for distance calculations.
       - INVENTORY: Suggest REAL, EXISTING hotels/properties that are searchable on Google Hotels. Do NOT invent names.
       - PRICING: Provide an estimated baseline price per night.
       - REVIEWS: For each accommodation, provide 3 short review snippets that sound like real guest feedback, and a TripAdvisor-style rating (0-5).
    8. ITINERARY: Provide a day-by-day plan covering the full ${params.duration} days. For each day, list activities with specific TIMES (e.g., 09:00 AM). 
    9. COSTS: For each day of the itinerary, estimate specific costs for Breakfast, Lunch, Dinner, and local Transportation.
    10. TRANSPORTATION: Provide a list of available transportation methods (e.g., Taxi, Bus, Metro) with an AVERAGE COST for a typical trip/ticket.
    11. ACTIVITIES: Suggest 6 distinct local paid activities or tours (e.g., "Museum Skip-the-line", "Boat Tour", "Food Tour"). Include estimated price per person and rating.
    12. COORDINATES: Provide the central latitude and longitude for the destination city.
    13. WEATHER: Provide a daily forecast (Day 1, Day 2...) with temperature and condition (Sunny, Rainy, etc) typical for this season.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING },
        country: { type: Type.STRING },
        coordinates: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
        },
        startDate: { type: Type.STRING, description: 'Selected Start Date YYYY-MM-DD' },
        endDate: { type: Type.STRING, description: 'Selected End Date YYYY-MM-DD' },
        seasonality: { type: Type.STRING, description: 'e.g. High Season' },
        totalEstimatedCost: { type: Type.NUMBER },
        currency: { type: Type.STRING },
        duration: { type: Type.NUMBER },
        description: { type: Type.STRING, description: 'A captivating summary of the trip.' },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        dailyWeather: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              temperature: { type: Type.STRING },
              condition: { type: Type.STRING },
            },
          },
        },
        flightInfo: {
          type: Type.OBJECT,
          properties: {
            airline: { type: Type.STRING },
            outboundRoute: { type: Type.STRING, description: 'e.g. JFK (10:00) -> LHR (22:00)' },
            outboundPrice: { type: Type.STRING, description: 'Cost of outbound flight' },
            returnRoute: { type: Type.STRING, description: 'e.g. LHR (08:00) -> JFK (11:00)' },
            returnPrice: { type: Type.STRING, description: 'Cost of return flight' },
            totalPrice: { type: Type.STRING, description: 'Total flight cost' },
            duration: { type: Type.STRING, description: 'Total flight duration approx' },
            layovers: { type: Type.STRING, description: 'Details about stops' },
            outboundFlexibleDates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  price: { type: Type.STRING },
                },
              },
            },
            returnFlexibleDates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  price: { type: Type.STRING },
                },
              },
            },
          },
        },
        accommodationInfo: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              location: { type: Type.STRING },
              coordinates: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                },
              },
              pricePerNight: { type: Type.STRING },
              rating: { type: Type.STRING },
              amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
              reviewSnippets: { type: Type.ARRAY, items: { type: Type.STRING } },
              tripAdvisorRating: { type: Type.STRING },
            },
          },
        },
        transportation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              cost: { type: Type.STRING },
              description: { type: Type.STRING },
            },
          },
        },
        detailedItinerary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              title: { type: Type.STRING },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                },
              },
              expenses: {
                type: Type.OBJECT,
                properties: {
                  breakfast: { type: Type.STRING },
                  lunch: { type: Type.STRING },
                  dinner: { type: Type.STRING },
                  transport: { type: Type.STRING },
                  totalDaily: { type: Type.STRING },
                },
              },
            },
          },
        },
        localActivities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              price: { type: Type.STRING },
              rating: { type: Type.STRING },
              duration: { type: Type.STRING },
            },
          },
        },
      },
      required: [
        'destination',
        'country',
        'totalEstimatedCost',
        'currency',
        'duration',
        'description',
        'tags',
        'flightInfo',
        'accommodationInfo',
        'transportation',
        'detailedItinerary',
        'localActivities',
        'dailyWeather',
        'startDate',
        'endDate',
        'seasonality',
      ],
    },
  };

  // We try models with automatic fallback & retry to handle transient high-demand spikes
  const models = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Generating trip suggestions using ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      if (response.text) {
        recordGeminiCall(response.usageMetadata);
        const clean = cleanJson(response.text);
        const suggestions = JSON.parse(clean);
        const formatted = suggestions.map((s: any) => ({
          ...s,
          travelers: params.travelers,
          startDate: s.startDate,
          endDate: s.endDate,
        }));
        return res.json({ suggestions: formatted });
      }
    } catch (err: any) {
      console.warn(`Trip generation failed with ${model}:`, err?.status || err?.message);
      lastError = err;
      // Wait a brief delay before trying fallback
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  return res.status(500).json({
    error: lastError?.message || 'Failed to generate trip suggestions. Please try again.',
  });
});

// 4. SerpApi Proxy: Hotel Details
app.get('/api/serpapi/hotel-details', async (req: Request, res: Response) => {
  const { hotelName, location, checkIn, checkOut, adults, currency } = req.query;

  if (!hotelName || !location || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'Missing required hotel query parameters' });
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: `${hotelName} ${location}`,
      check_in_date: String(checkIn),
      check_out_date: String(checkOut),
      adults: String(adults || 1),
      currency: String(currency || 'USD'),
      gl: 'us',
      hl: 'en',
      api_key: SERPAPI_KEY,
    });

    const response = await fetch(`${SERPAPI_BASE}/search.json?${params.toString()}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `SerpApi Error: ${response.statusText}` });
    }

    const data = await response.json();
    if (data.properties && data.properties.length > 0) {
      const best = data.properties[0];
      let priceVal = best.rate_per_night?.lowest;
      if (best.rate_per_night?.extracted_lowest) {
        priceVal = `${best.rate_per_night.extracted_lowest} ${currency || 'USD'}`;
      }

      // Invalidate cached account info to refresh search count next time
      lastSerpApiFetchTime = 0;

      return res.json({
        price: priceVal,
        link: best.link,
        source: best.rate_per_night?.extracted_before_tax ? 'Google Hotels' : undefined,
        rating: best.overall_rating,
        reviews: best.reviews,
      });
    }

    return res.json(null);
  } catch (err: any) {
    console.warn('SerpApi hotel-details proxy failed:', err.message);
    return res.json(null);
  }
});

// 5. SerpApi Proxy: Hotel Search
app.get('/api/serpapi/search-hotels', async (req: Request, res: Response) => {
  const { destination, checkIn, checkOut, adults, currency, limit } = req.query;

  if (!destination || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'Missing required search parameters' });
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: `hotels in ${destination}`,
      check_in_date: String(checkIn),
      check_out_date: String(checkOut),
      adults: String(adults || 1),
      currency: String(currency || 'USD'),
      gl: 'us',
      hl: 'en',
      api_key: SERPAPI_KEY,
    });

    const response = await fetch(`${SERPAPI_BASE}/search.json?${params.toString()}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `SerpApi Error: ${response.statusText}` });
    }

    const data = await response.json();
    const properties = data.properties || [];

    const start = new Date(String(checkIn));
    const end = new Date(String(checkOut));
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const lim = Number(limit) || 6;

    // Invalidate cached account info to refresh quota count next time
    lastSerpApiFetchTime = 0;

    const results = properties.slice(0, lim).map((prop: any) => {
      let priceStr = 'Check Price';
      let numericPrice = 0;

      const rpn = prop.rate_per_night;
      const tr = prop.total_rate;

      if (rpn?.extracted_lowest) {
        numericPrice = rpn.extracted_lowest;
      } else if (tr?.extracted_lowest) {
        numericPrice = Math.round(tr.extracted_lowest / nights);
      }

      if (numericPrice > 0) {
        priceStr = `${numericPrice} ${currency || 'USD'}`;
      } else if (rpn?.lowest) {
        priceStr = rpn.lowest;
      }

      return {
        name: prop.name,
        type: 'Hotel',
        location: destination,
        coordinates: prop.gps_coordinates
          ? { lat: prop.gps_coordinates.latitude, lng: prop.gps_coordinates.longitude }
          : { lat: 0, lng: 0 },
        pricePerNight: priceStr,
        rating: prop.overall_rating ? prop.overall_rating.toString() : '0',
        amenities: prop.amenities || [],
        reviewSnippets: prop.snippet ? [prop.snippet] : [],
        tripAdvisorRating: prop.overall_rating ? prop.overall_rating.toString() : undefined,
        link: prop.link,
      };
    });

    return res.json(results);
  } catch (err: any) {
    console.warn('SerpApi search-hotels proxy failed:', err.message);
    return res.json([]);
  }
});

// 6. SerpApi Proxy: Google Images
app.get('/api/serpapi/images', async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q required' });
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_images',
      q: String(q),
      google_domain: 'google.com',
      gl: 'us',
      hl: 'en',
      tbm: 'isch',
      ijn: '0',
      api_key: SERPAPI_KEY,
    });

    const response = await fetch(`${SERPAPI_BASE}/search.json?${params.toString()}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `SerpApi Error: ${response.statusText}` });
    }

    const data = await response.json();
    if (data.images_results && data.images_results.length > 0) {
      const url = data.images_results[0].original || data.images_results[0].thumbnail;
      lastSerpApiFetchTime = 0;
      return res.json({ url });
    }

    return res.json({ url: null });
  } catch (err: any) {
    console.warn('SerpApi images proxy failed:', err.message);
    return res.json({ url: null });
  }
});

// ----------------------------------------------------
// SERVER STARTUP WITH VITE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Budget Trip Planner fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
