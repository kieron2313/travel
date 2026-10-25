import { SearchParams, TripSuggestion, QuotaInfo } from "../types";

export const getCityFromCoordinates = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch('/api/gemini/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon })
    });

    if (!res.ok) {
      console.warn("Geocode request failed with status:", res.status);
      return "";
    }

    const data = await res.json();
    return data.city || "";
  } catch (error) {
    console.error("Error getting city from coordinates:", error);
    return "";
  }
};

export const generateTripSuggestions = async (params: SearchParams): Promise<TripSuggestion[]> => {
  // Validate Search Window
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  if (diffDays < params.duration) {
    throw new Error(`Your search window (${diffDays} days) is shorter than your desired trip duration (${params.duration} days). Please extend the 'Until' date.`);
  }

  const response = await fetch('/api/gemini/generate-trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    let errorMsg = 'Failed to generate trip suggestions.';
    try {
      const errData = await response.json();
      if (errData?.error) errorMsg = errData.error;
    } catch {
      errorMsg = `Server error (${response.status}): ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.suggestions || [];
};

export const fetchQuotaInfo = async (): Promise<QuotaInfo | null> => {
  try {
    const res = await fetch('/api/quota');
    if (!res.ok) throw new Error(`Quota request failed with ${res.status}`);
    const data: QuotaInfo = await res.json();
    return data;
  } catch (error) {
    console.warn("Error fetching quota:", error);
    return null;
  }
};
