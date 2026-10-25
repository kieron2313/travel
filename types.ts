
export enum AccommodationType {
  HOTEL = 'Hotel',
  HOSTEL = 'Hostel',
  AIRBNB = 'Airbnb/Apartment',
  RESORT = 'Resort',
  VILLA = 'Villa',
  CAMPING = 'Camping'
}

export interface SearchParams {
  origin: string;
  destination?: string;
  
  // Exact Date Period
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD

  // Manual Duration (Decoupled from dates)
  duration: number; 
  
  travelers: number;
  budget: number;
  currency: string;
  accommodations: AccommodationType[];
  interests: string;
  maxDistanceFromCenter?: number; // in km
}

export interface FlexibleDate {
  date: string;
  price: string;
}

export interface FlightInfo {
  airline: string;
  outboundRoute: string; // e.g. "LHR -> JFK"
  outboundPrice: string;
  returnRoute: string;
  returnPrice: string;
  duration: string;
  layovers: string;
  totalPrice: string; // Combined estimate
  outboundFlexibleDates: FlexibleDate[];
  returnFlexibleDates: FlexibleDate[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AccommodationInfo {
  name: string;
  type: string;
  location: string;
  coordinates: Coordinates;
  pricePerNight: string; // Keep as a fallback baseline
  rating: string;
  amenities: string[];
  reviewSnippets?: string[];
  tripAdvisorRating?: string;
}

export interface Activity {
  time: string;
  description: string;
}

export interface DayExpenses {
  breakfast: string;
  lunch: string;
  dinner: string;
  transport: string;
  totalDaily: string;
}

export interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
  expenses: DayExpenses;
}

export interface TransportationOption {
  type: string;
  cost: string;
  description: string;
}

export interface DailyWeather {
  day: number;
  temperature: string;
  condition: string;
}

export interface LocalActivity {
  title: string;
  type: string;
  price: string;
  rating: string;
  duration: string;
}

export interface SerpApiImageResult {
  position: number;
  thumbnail: string;
  source: string;
  title: string;
  original: string;
}

export interface SerpApiHotelResult {
  price?: string;
  link?: string;
  source?: string; // e.g. "Booking.com" via Google
  rating?: number;
  reviews?: number;
}

export interface TripSuggestion {
  destination: string;
  country: string;
  coordinates: Coordinates;
  totalEstimatedCost: number;
  currency: string;
  duration: number;
  description: string;
  tags: string[];
  
  // Specific Date Information
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD
  seasonality: string; // e.g. "High Season", "Off-peak", "Rainy Season"
  
  // Context fields injected after generation for Booking Links
  travelers?: number;
  
  // Detailed structured data
  flightInfo: FlightInfo;
  accommodationInfo: AccommodationInfo[]; 
  transportation: TransportationOption[]; 
  detailedItinerary: DayPlan[];
  dailyWeather: DailyWeather[];
  localActivities: LocalActivity[];
}

export const INTEREST_TAGS = [
  "Nature", "History", "Food", "Nightlife", "Adventure", "Relaxation", 
  "Shopping", "Art", "Music", "Photography", "Hiking", "Beach"
];

export interface SerpApiQuota {
  status: 'active' | 'exhausted' | 'error';
  accountEmail: string;
  planName: string;
  totalSearches: number;
  searchesLeft: number;
  searchesUsedThisMonth: number;
  searchesUsedThisHour: number;
  hourlyLimit: number;
  renewalDate: string;
  lastUpdated: string;
}

export interface GeminiQuota {
  status: 'operational' | 'high_demand' | 'error';
  dailyLimit: number;
  requestsUsedToday: number;
  requestsLeftToday: number;
  totalTokensUsed: number;
  promptTokensUsed: number;
  candidatesTokensUsed: number;
  rpmLimit: number;
  requestsInCurrentMinute: number;
  model: string;
  lastUsed?: string | null;
}

export interface QuotaInfo {
  serpApi: SerpApiQuota;
  gemini: GeminiQuota;
  summary: {
    searchesLeft: number;
    searchesTotal: number;
    geminiRequestsLeft: number;
    geminiDailyLimit: number;
  };
}
