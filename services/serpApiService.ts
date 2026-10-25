import { SerpApiHotelResult, AccommodationInfo } from "../types";

export const getGoogleImages = async (query: string): Promise<string | null> => {
  try {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`/api/serpapi/images?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.warn("Failed to fetch images from SerpApi proxy:", error);
    return null;
  }
};

export const getHotelDetails = async (
  hotelName: string, 
  location: string, 
  checkIn: string, 
  checkOut: string,
  adults: number = 1,
  currency: string = 'USD'
): Promise<SerpApiHotelResult | null> => {
  try {
    const params = new URLSearchParams({
      hotelName,
      location,
      checkIn,
      checkOut,
      adults: adults.toString(),
      currency,
    });

    const response = await fetch(`/api/serpapi/hotel-details?${params.toString()}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Failed to fetch hotel prices from SerpApi proxy:", error);
    return null;
  }
};

export const searchHotels = async (
  destination: string,
  checkIn: string,
  checkOut: string,
  adults: number = 1,
  currency: string = 'USD',
  limit: number = 6
): Promise<AccommodationInfo[]> => {
  try {
    const params = new URLSearchParams({
      destination,
      checkIn,
      checkOut,
      adults: adults.toString(),
      currency,
      limit: limit.toString(),
    });

    const response = await fetch(`/api/serpapi/search-hotels?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Failed to search hotels via SerpApi proxy:", error);
    return [];
  }
};
