
import React, { useState, useEffect, useMemo } from 'react';
import { TripSuggestion, AccommodationInfo, LocalActivity, SerpApiHotelResult, QuotaInfo } from '../types';
import { ArrowLeft, Plane, Hotel, Bus, Calendar, MapPin, Star, CheckCircle2, Clock, Train, Car, Bike, Footprints, Home, Tent, Palmtree, Split, Waves, BedDouble, Utensils, Coffee, Wine, Building, PlaneTakeoff, PlaneLanding, Plus, Loader2, Bookmark, ExternalLink, Pencil, Save, X, SlidersHorizontal, ArrowUpDown, Route, MessageSquareQuote, Sun, Cloud, CloudRain, Snowflake, Wind, Zap, CloudSun, Leaf, Ticket, ChevronRight, Globe, Search, Activity } from 'lucide-react';
import { getGoogleImages, getHotelDetails, searchHotels } from '../services/serpApiService';

interface TripDetailsPageProps {
  trip: TripSuggestion;
  onBack: () => void;
  onOpenQuota?: () => void;
  quota?: QuotaInfo | null;
}

// Helper to safely get lowercase type
const safeType = (type: string | undefined) => (type || '').toLowerCase();

// Helper to parse price string to number
const parsePrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  // Remove non-numeric chars except dot
  const numericString = priceStr.replace(/[^0-9.]/g, '');
  return parseFloat(numericString) || 0;
};

// Helper to parse rating string to number with normalization (10 scale -> 5 scale)
const parseRating = (ratingStr: string): number => {
  if (!ratingStr) return 0;
  const num = parseFloat(ratingStr.replace(/[^0-9.]/g, ''));
  if (num > 5 && num <= 10) return num / 2;
  return num || 0;
};

// Haversine formula to calculate distance in km
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

// Helper for specific accommodation icons
const getAccommodationIcon = (type: string, className: string = "w-4 h-4") => {
  const t = safeType(type);
  if (t.includes('resort')) return <Palmtree className={className} aria-hidden="true" />;
  if (t.includes('camp')) return <Tent className={className} aria-hidden="true" />;
  if (t.includes('villa') || t.includes('home') || t.includes('airbnb')) return <Home className={className} aria-hidden="true" />;
  if (t.includes('hostel')) return <BedDouble className={className} aria-hidden="true" />;
  if (t.includes('apartment')) return <Building className={className} aria-hidden="true" />;
  return <Hotel className={className} aria-hidden="true" />;
};

// Helper for accommodation type styling
const getAccommodationStyle = (type: string) => {
  const t = safeType(type);
  if (t.includes('resort')) return 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/20';
  if (t.includes('camp')) return 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/20';
  if (t.includes('villa') || t.includes('home')) return 'bg-gradient-to-r from-teal-500 to-cyan-500 shadow-teal-500/20';
  if (t.includes('hostel')) return 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/20';
  if (t.includes('apartment')) return 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/20';
  return 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-indigo-500/20';
};

const getTransportIcon = (type: string) => {
  const t = safeType(type);
  if (t.includes('train') || t.includes('metro')) return <Train className="w-5 h-5" aria-hidden="true" />;
  if (t.includes('bus')) return <Bus className="w-5 h-5" aria-hidden="true" />;
  if (t.includes('taxi') || t.includes('car')) return <Car className="w-5 h-5" aria-hidden="true" />;
  if (t.includes('bike')) return <Bike className="w-5 h-5" aria-hidden="true" />;
  if (t.includes('walk')) return <Footprints className="w-5 h-5" aria-hidden="true" />;
  if (t.includes('boat')) return <Waves className="w-5 h-5" aria-hidden="true" />;
  return <MapPin className="w-5 h-5" aria-hidden="true" />;
};

const getWeatherIcon = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('shower')) return <CloudRain className="w-5 h-5 text-blue-400" aria-hidden="true" />;
  if (c.includes('snow')) return <Snowflake className="w-5 h-5 text-cyan-200" aria-hidden="true" />;
  if (c.includes('storm') || c.includes('thunder')) return <Zap className="w-5 h-5 text-yellow-500" aria-hidden="true" />;
  if (c.includes('cloud') && c.includes('sun')) return <CloudSun className="w-5 h-5 text-orange-300" aria-hidden="true" />;
  if (c.includes('cloud')) return <Cloud className="w-5 h-5 text-gray-400" aria-hidden="true" />;
  if (c.includes('wind')) return <Wind className="w-5 h-5 text-slate-300" aria-hidden="true" />;
  return <Sun className="w-5 h-5 text-orange-500" aria-hidden="true" />;
};

interface BookingContext {
  travelers: number;
  startDate?: string;
  duration: number;
  currency: string;
}

// --- Activity Card with Robust Image Handling ---
const ActivityCard: React.FC<{ activity: LocalActivity; destination: string; index: number }> = ({ activity, destination, index }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [realImage, setRealImage] = useState<string | null>(null);

  // Fetch real image from SerpApi
  useEffect(() => {
    let isMounted = true;
    const fetchRealImage = async () => {
      try {
        const query = `${activity.title} ${destination} tourist attraction`;
        const img = await getGoogleImages(query);
        if (isMounted && img) {
          setRealImage(img);
        }
      } catch (e) {
        console.warn("Failed to fetch activity image", e);
      }
    };
    fetchRealImage();
    return () => { isMounted = false; };
  }, [activity.title, destination]);

  const actPrompt = encodeURIComponent(`${activity.title} in ${destination} tourist attraction real photography`);
  const imageUrl = `https://image.pollinations.ai/prompt/${actPrompt}?width=600&height=400&nologo=true&seed=${index + 100}&model=flux`;
  const fallbackImage = "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=600";
  
  const bookLink = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(activity.title + ' ' + destination)}&ssrc=A`;

  // Determine source: Real > AI > Fallback
  const displayImage = realImage || (error ? fallbackImage : imageUrl);

  return (
    <a 
      href={bookLink}
      target="_blank"
      rel="noopener noreferrer" 
      className="group bg-[#1e293b] border border-white/5 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all block h-full flex flex-col"
    >
      <div className="h-40 overflow-hidden relative bg-slate-800">
         {/* Skeleton Loader */}
         <div className={`absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse transition-opacity duration-300 ${loading && !realImage ? 'opacity-100' : 'opacity-0'}`} />
         
         <img 
           src={displayImage} 
           alt={activity.title}
           onLoad={() => setLoading(false)}
           onError={() => {
             if (!realImage) { // Only set error if we aren't already using a real image
                 setError(true);
             }
             setLoading(false);
           }}
           className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${loading && !realImage ? 'opacity-0' : 'opacity-100'}`} 
         />
         <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white border border-white/10 flex items-center gap-1">
           <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {activity.rating}
         </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
         <h4 className="font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">{activity.title}</h4>
         <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-400">{activity.type}</span>
            <span className="font-bold text-green-400">{activity.price}</span>
         </div>
         <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.duration}</span>
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Book Activity <ExternalLink className="w-3 h-3" /></span>
         </div>
      </div>
    </a>
  );
};

// Sub-component for individual accommodation card to handle image state
const AccommodationCard: React.FC<{ acc: AccommodationInfo; cityCenter?: {lat: number, lng: number}; bookingContext: BookingContext }> = ({ acc, cityCenter, bookingContext }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [realImage, setRealImage] = useState<string | null>(null);

  // If using the searchHotels method, the 'acc' object might already have a direct booking link
  // stored in a custom property if we mapped it, OR we use the standard search fallback.
  const directLink = (acc as any).link; 

  if (!acc) return null;

  // Helper to get dates
  const getDates = () => {
    let checkinDate: string;
    let checkoutDate: string;

    if (bookingContext.startDate) {
        const start = new Date(bookingContext.startDate);
        checkinDate = start.toISOString().split('T')[0];
        const end = new Date(start);
        end.setDate(end.getDate() + bookingContext.duration);
        checkoutDate = end.toISOString().split('T')[0];
    } else {
        const now = new Date();
        now.setDate(now.getDate() + 3);
        checkinDate = now.toISOString().split('T')[0];
        now.setDate(now.getDate() + bookingContext.duration);
        checkoutDate = now.toISOString().split('T')[0];
    }
    return { checkinDate, checkoutDate };
  };

  const { checkinDate, checkoutDate } = getDates();

  // Fetch real image from SerpApi
  useEffect(() => {
    let isMounted = true;
    
    const fetchRealImage = async () => {
      try {
        const query = `${acc.name} ${acc.location} hotel building exterior`;
        const img = await getGoogleImages(query);
        if (isMounted && img) {
          setRealImage(img);
        }
      } catch (e) {
        console.warn("Failed to fetch accommodation image", e);
      }
    };

    fetchRealImage();

    return () => { isMounted = false; };
  }, [acc.name, acc.location]);

  // Optimized prompt to mimic professional hotel photography
  const accImagePrompt = encodeURIComponent(`interior bedroom photo of ${acc.name} ${acc.location} hotel room real 4k photorealistic professional hotel website style lighting cozy modern`);
  const accImageUrl = `https://image.pollinations.ai/prompt/${accImagePrompt}?width=600&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}&model=flux`;
  const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600";
  
  const ratingVal = parseRating(acc.rating);

  // Determine source: Real > AI > Fallback
  const displayImage = realImage || accImageUrl;

  // Calculate distance
  const distance = useMemo(() => {
    if (!cityCenter || !acc.coordinates || acc.coordinates.lat === 0) return null;
    return getDistanceFromLatLonInKm(cityCenter.lat, cityCenter.lng, acc.coordinates.lat, acc.coordinates.lng);
  }, [cityCenter, acc]);

  const distanceStr = distance !== null 
    ? (distance < 1 ? `${(distance * 1000).toFixed(0)}m from center` : `${distance.toFixed(1)} km from center`)
    : null;


  const handleBookingClick = () => {
    if (directLink) {
        window.open(directLink, '_blank');
    } else {
        // Fallback to Google Search
        const q = `book ${acc.name} ${acc.location} dates ${checkinDate} to ${checkoutDate}`;
        window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
    }
  };

  return (
    <article className="group bg-[#1e293b] rounded-3xl border border-white/5 hover:border-white/10 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl relative h-full">
      {/* Accommodation Image */}
      <div className="h-48 relative overflow-hidden bg-slate-800">
         {/* Skeleton Loader / Blur Up */}
         <div className={`absolute inset-0 bg-slate-800 z-10 flex items-center justify-center transition-opacity duration-500 ${imageLoaded || realImage ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} aria-hidden="true">
             <div className="w-full h-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse"></div>
         </div>
         
         <img 
           src={displayImage} 
           alt={`View of ${acc.name}`}
           onLoad={() => setImageLoaded(true)}
           onError={(e) => {
             if (!realImage) {
                 e.currentTarget.src = fallbackImage;
             }
             setImageLoaded(true);
           }}
           className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${imageLoaded || realImage ? 'opacity-100' : 'opacity-0'}`}
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-transparent to-transparent z-0" aria-hidden="true"></div>
         
         {/* Type Badge */}
         <div className={`absolute top-3 right-3 ${getAccommodationStyle(acc.type)} text-white pl-1.5 pr-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-sm z-20 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-default border border-white/10`}>
            <div className="w-6 h-6 flex items-center justify-center bg-white/20 rounded-full shadow-sm backdrop-blur-md" aria-hidden="true">
               {getAccommodationIcon(acc.type, "w-3.5 h-3.5")}
            </div>
            <span className="tracking-wide uppercase text-[10px]">{acc.type || 'Hotel'}</span>
         </div>

         {/* Visual Rating */}
         <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/10 z-20" aria-label={`Rated ${acc.rating} out of 5 stars`}>
            <div className="flex gap-0.5" aria-hidden="true">
               {[...Array(5)].map((_, i) => (
                 <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < Math.round(ratingVal) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-600/50 text-gray-500'}`} 
                 />
               ))}
            </div>
            <span className="text-[10px] font-bold text-white ml-1.5 pt-0.5">{acc.rating}</span>
         </div>
      </div>

      <div className="p-5 flex-1 flex flex-col relative overflow-hidden z-10">
        {/* Watermark Icon Background */}
        <div className="absolute -right-6 -bottom-6 text-white/5 rotate-12 transform group-hover:rotate-0 transition-all duration-500 pointer-events-none" aria-hidden="true">
           {getAccommodationIcon(acc.type, "w-24 h-24")}
        </div>

        <div className="mb-4 relative z-10">
           <h4 className="text-lg font-bold text-white leading-snug mb-1 line-clamp-2">{acc.name}</h4>
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-1 text-gray-300 text-xs">
               <MapPin className="w-3 h-3" aria-hidden="true" /> {acc.location}
             </div>
             {distanceStr && (
               <div className="flex items-center gap-1 text-teal-400 text-xs font-medium">
                  <Route className="w-3 h-3" aria-hidden="true" /> {distanceStr}
               </div>
             )}
           </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
           {acc.amenities?.slice(0, 3).map((am, i) => (
             <span key={i} className="text-[10px] font-medium bg-white/5 px-2 py-1 rounded-md text-gray-300 border border-white/5">
               {am}
             </span>
           ))}
        </div>

        {/* Guest Impressions / Reviews Section */}
        {acc.reviewSnippets && acc.reviewSnippets.length > 0 && (
           <div className="mb-5 relative z-10">
              <button 
                onClick={() => setShowReviews(!showReviews)}
                aria-expanded={showReviews}
                className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-500 hover:text-teal-400 transition-colors mb-2"
              >
                <MessageSquareQuote className="w-3 h-3" aria-hidden="true" /> Guest Impressions
              </button>
              
              <div className={`space-y-2 ${showReviews ? 'block' : 'hidden'}`}>
                {acc.reviewSnippets.map((snippet, idx) => (
                  <div key={idx} className="bg-white/5 p-2 rounded-lg text-[10px] text-gray-300 italic border-l-2 border-teal-500/50">
                    "{snippet}"
                  </div>
                ))}
              </div>
              
              {!showReviews && (
                 <p className="text-[10px] text-gray-400 italic line-clamp-1">"{acc.reviewSnippets[0]}"</p>
              )}
           </div>
        )}
        
        <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3 relative z-10">
           
           {/* Price Display */}
           <div className="flex justify-between items-center bg-black/30 px-4 py-3 rounded-xl border border-white/5">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Price / Night
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-teal-400">
                            {acc.pricePerNight}
                        </span>
                    </div>
                </div>
                
                <button 
                    onClick={handleBookingClick}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-teal-500/20"
                >
                    View Deal <ExternalLink className="w-3 h-3" />
                </button>
           </div>
        </div>
      </div>
    </article>
  );
};

export const TripDetailsPage: React.FC<TripDetailsPageProps> = ({ trip, onBack, onOpenQuota, quota }) => {
  const [visibleAccommodations, setVisibleAccommodations] = useState(6); // Limit to 6
  const [fetchedAccommodations, setFetchedAccommodations] = useState<AccommodationInfo[] | null>(null);
  const [loadingStays, setLoadingStays] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [realHeroImage, setRealHeroImage] = useState<string | null>(null);
  
  // Description Editing State
  const [description, setDescription] = useState(trip?.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  // Filter States
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [maxDistance, setMaxDistance] = useState<number>(20);
  const [minRating, setMinRating] = useState<number>(0);
  
  // Sort State
  const [accSort, setAccSort] = useState<'recommended' | 'price_low' | 'price_high' | 'rating'>('recommended');

  // Calculate Dates for Flight Display using Real generated StartDate if available
  const getFlightDate = (addDays: number = 0) => {
    let d: Date;
    if (trip.startDate) {
        d = new Date(trip.startDate);
    } else {
        d = new Date(); 
    }
    d.setDate(d.getDate() + addDays);
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getTripDatesRange = () => {
    let start: Date;
    let end: Date;
    
    if (trip.startDate) {
        start = new Date(trip.startDate);
        // If end date exists from new logic, use it, else fallback to duration calc
        if (trip.endDate) {
           end = new Date(trip.endDate);
        } else {
           end = new Date(start);
           end.setDate(end.getDate() + trip.duration);
        }
    } else {
        start = new Date();
        end = new Date();
        end.setDate(end.getDate() + trip.duration);
    }
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${start.getFullYear()}`;
  };

  const outboundDate = getFlightDate(0);
  const returnDate = getFlightDate(trip.duration);
  const tripDates = getTripDatesRange();

  // Fetch Real Landmark Image from SerpApi (Priority) then Wikipedia API (Fallback)
  useEffect(() => {
    if (!trip.destination) return;

    const fetchHeroImage = async () => {
        try {
            // Attempt 1: SerpApi Google Images (Highest Quality)
            const serpImage = await getGoogleImages(`${trip.destination} ${trip.country} famous landmark scenic photography`);
            if (serpImage) {
                setRealHeroImage(serpImage);
                return;
            }

            // Attempt 2: Wikipedia API (Fallback)
            const endpoint = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(trip.destination)}&origin=*`;
            const response = await fetch(endpoint);
            const data = await response.json();
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pageId !== '-1' && pages[pageId].original && pages[pageId].original.source) {
                setRealHeroImage(pages[pageId].original.source);
            }
        } catch (err) {
            console.warn("Could not fetch real image, falling back to AI", err);
        }
    };

    fetchHeroImage();
  }, [trip.destination, trip.country]);
  
  // Fetch Real Accommodations via SerpApi
  useEffect(() => {
    if (!trip.destination) return;

    const loadRealStays = async () => {
        setLoadingStays(true);
        let checkInStr = '';
        let checkOutStr = '';
        
        if (trip.startDate) {
            const start = new Date(trip.startDate);
            checkInStr = start.toISOString().split('T')[0];
            const end = new Date(start);
            end.setDate(end.getDate() + trip.duration);
            checkOutStr = end.toISOString().split('T')[0];
        } else {
             const now = new Date();
             now.setDate(now.getDate() + 3);
             checkInStr = now.toISOString().split('T')[0];
             now.setDate(now.getDate() + trip.duration);
             checkOutStr = now.toISOString().split('T')[0];
        }

        const realStays = await searchHotels(
            trip.destination,
            checkInStr,
            checkOutStr,
            trip.travelers || 1,
            trip.currency
        );
        
        if (realStays && realStays.length > 0) {
            setFetchedAccommodations(realStays);
        }
        setLoadingStays(false);
    };

    loadRealStays();
  }, [trip.destination, trip.startDate, trip.duration, trip.travelers, trip.currency]);

  const handleBookFlight = () => {
    if (!trip.flightInfo) return;
    const routeQuery = `${trip.flightInfo.airline} flight ${trip.flightInfo.outboundRoute}`;
    const query = `book ${routeQuery} official site`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  // --- Filtering Logic Setup ---
  
  // Use fetched accommodations if available, otherwise fallback to trip.accommodationInfo (AI)
  const sourceAccommodations = fetchedAccommodations || trip.accommodationInfo || [];

  // 1. Extract Unique Types from Data
  const availableTypes = useMemo(() => {
    if (!sourceAccommodations) return [];
    return Array.from(new Set(sourceAccommodations.map(acc => acc.type)));
  }, [sourceAccommodations]);

  // 2. Determine Stats (Price & Distance)
  const stats = useMemo(() => {
    if (!sourceAccommodations || sourceAccommodations.length === 0) return { maxPrice: 1000, maxDist: 20 };
    
    const prices = sourceAccommodations.map(acc => parsePrice(acc.pricePerNight));
    const cityLat = trip.coordinates?.lat || 0;
    const cityLng = trip.coordinates?.lng || 0;
    
    const distances = sourceAccommodations.map(acc => {
       if (acc.coordinates && cityLat !== 0) {
          return getDistanceFromLatLonInKm(cityLat, cityLng, acc.coordinates.lat, acc.coordinates.lng);
       }
       return 0;
    });

    return {
      maxPrice: Math.max(...prices, 100),
      maxDist: Math.ceil(Math.max(...distances, 5))
    };
  }, [sourceAccommodations, trip.coordinates]);

  // Initialize max filters when data loads
  useEffect(() => {
    setMaxPrice(Math.ceil(stats.maxPrice));
    setMaxDistance(stats.maxDist);
  }, [stats.maxPrice, stats.maxDist]);

  // 3. Filter & Sort the Data
  const processedAccommodations = useMemo(() => {
    let result = sourceAccommodations.filter(acc => {
      // Type Filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(acc.type)) {
        return false;
      }
      
      // Price Filter
      const price = parsePrice(acc.pricePerNight);
      if (price > maxPrice) {
        return false;
      }

      // Distance Filter
      if (trip.coordinates && acc.coordinates && acc.coordinates.lat !== 0) {
        const dist = getDistanceFromLatLonInKm(trip.coordinates.lat, trip.coordinates.lng, acc.coordinates.lat, acc.coordinates.lng);
        if (dist > maxDistance) return false;
      }

      // Rating Filter
      const rating = parseRating(acc.rating);
      if (rating < minRating) {
        return false;
      }

      return true;
    });

    // Then Sort
    if (accSort === 'price_low') {
      result.sort((a, b) => parsePrice(a.pricePerNight) - parsePrice(b.pricePerNight));
    } else if (accSort === 'price_high') {
      result.sort((a, b) => parsePrice(b.pricePerNight) - parsePrice(a.pricePerNight));
    } else if (accSort === 'rating') {
      result.sort((a, b) => parseRating(b.rating) - parseRating(a.rating));
    } else if (accSort === 'recommended') {
      // Smart Scoring Algorithm
      const tripTags = (trip.tags || []).join(' ').toLowerCase();
      const cityLat = trip.coordinates?.lat || 0;
      const cityLng = trip.coordinates?.lng || 0;

      result = result.map(acc => {
        let score = 0;
        const price = parsePrice(acc.pricePerNight);
        const rating = parseRating(acc.rating);
        const type = safeType(acc.type);
        const amenities = (acc.amenities || []).join(' ').toLowerCase();

        // 1. Quality Score
        score += (rating / 5) * 35;

        // 2. Value Score
        const effectiveMax = stats.maxPrice || 100; 
        const priceFactor = 1 - Math.min(price / effectiveMax, 1);
        score += priceFactor * 30;

        // 3. Proximity Score (Exponential Decay)
        if (acc.coordinates && cityLat !== 0) {
           const dist = getDistanceFromLatLonInKm(cityLat, cityLng, acc.coordinates.lat, acc.coordinates.lng);
           const distScore = 15 * Math.exp(-0.2 * dist); 
           score += distScore;
        }

        // 4. Vibe Match
        let vibeBonus = 0;
        if (tripTags.includes('relax') || tripTags.includes('beach')) {
           if (type.includes('resort') || type.includes('villa') || amenities.includes('pool')) vibeBonus += 20;
        } 
        else if (tripTags.includes('city') || tripTags.includes('nightlife')) {
           if (type.includes('hotel') || type.includes('apartment')) vibeBonus += 20;
        } 
        else if (tripTags.includes('budget') || tripTags.includes('backpack')) {
           if (type.includes('hostel') || type.includes('camping')) vibeBonus += 20;
        } 
        else if (tripTags.includes('nature')) {
           if (type.includes('camp') || type.includes('lodge')) vibeBonus += 20;
        }
        else {
           vibeBonus += 10;
        }
        score += vibeBonus;

        return { ...acc, _score: score };
      }).sort((a, b) => (b as any)._score - (a as any)._score);
    }

    return result;
  }, [sourceAccommodations, trip, selectedTypes, maxPrice, maxDistance, minRating, accSort, stats]);


  // Sync state if trip prop changes
  useEffect(() => {
    if (trip) setDescription(trip.description);
  }, [trip]);

  // Check if trip is already saved
  useEffect(() => {
    if (!trip) return;
    const savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
    const isAlreadySaved = savedTrips.some((t: TripSuggestion) => t.destination === trip.destination && t.totalEstimatedCost === trip.totalEstimatedCost);
    setIsSaved(isAlreadySaved);
  }, [trip]);

  const handleSaveTrip = () => {
    const savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
    if (isSaved) {
      const newTrips = savedTrips.filter((t: TripSuggestion) => !(t.destination === trip.destination && t.totalEstimatedCost === trip.totalEstimatedCost));
      localStorage.setItem('savedTrips', JSON.stringify(newTrips));
      setIsSaved(false);
    } else {
      const tripToSave = { ...trip, description };
      savedTrips.push(tripToSave);
      localStorage.setItem('savedTrips', JSON.stringify(savedTrips));
      setIsSaved(true);
    }
  };

  const handleSaveDescription = () => {
    if (isSaved) {
        const savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
        const updatedTrips = savedTrips.map((t: TripSuggestion) => {
            if (t.destination === trip.destination && t.totalEstimatedCost === trip.totalEstimatedCost) {
                return { ...t, description };
            }
            return t;
        });
        localStorage.setItem('savedTrips', JSON.stringify(updatedTrips));
    }
    setIsEditingDesc(false);
  };

  const handleCancelDescription = () => {
    setDescription(trip.description);
    setIsEditingDesc(false);
  };

  const toggleFilterType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (!trip) return null;

  const seed = useMemo(() => {
    return (trip.destination || 'trip').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }, [trip.destination]);

  const encodedDest = encodeURIComponent(`${trip.destination} ${trip.country} famous landmark real photography 8k hyperrealistic national geographic cinematic lighting`);
  const heroImageUrl = `https://image.pollinations.ai/prompt/${encodedDest}?width=1920&height=1080&nologo=true&model=flux&seed=${seed}`;

  const handleLoadMore = () => {
    setVisibleAccommodations(prev => Math.min(prev + 6, processedAccommodations.length));
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] animate-fadeIn pb-20">
      
      {/* Hero Header */}
      <header className="relative h-[50vh] lg:h-[60vh] w-full overflow-hidden bg-slate-900">
        {/* Shimmer/Blur Loader for Hero */}
        <div 
          className={`absolute inset-0 z-10 transition-opacity duration-700 ${heroImageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-hidden="true"
        >
          <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 animate-pulse bg-[length:200%_100%]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Loader2 className="w-10 h-10 text-teal-500 animate-spin opacity-50" />
          </div>
        </div>

        <img 
          src={realHeroImage || heroImageUrl} 
          alt={`Panoramic view of ${trip.destination}`}
          onLoad={() => setHeroImageLoaded(true)}
          onError={(e) => {
             if (e.currentTarget.src !== heroImageUrl) {
                e.currentTarget.src = heroImageUrl;
             } else {
                e.currentTarget.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1920";
             }
             setHeroImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-all duration-[1.5s] ease-out ${heroImageLoaded ? 'scale-100 blur-0 opacity-100 grayscale-0' : 'scale-110 blur-xl opacity-0 grayscale'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent" aria-hidden="true" />
        
        <div className="absolute top-6 left-4 right-4 md:left-6 md:right-6 z-30 flex justify-between items-center">
          <button 
            onClick={onBack}
            aria-label="Back to search results"
            className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white font-semibold transition-all border border-white/10 hover:border-white/30 group text-sm md:text-base focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </button>

          <div className="flex items-center gap-2">
            {onOpenQuota && (
              <button
                onClick={onOpenQuota}
                className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full font-semibold transition-all border border-white/10 hover:border-teal-500/50 text-gray-200 hover:text-white text-xs md:text-sm"
                title="View API Quota & Usage"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Activity className="w-4 h-4 text-teal-400" />
                <span className="hidden sm:inline">Quota:</span>
                <span className="font-bold text-teal-300">
                  {quota ? `${quota.serpApi.searchesLeft}/${quota.serpApi.totalSearches}` : 'Quota'}
                </span>
              </button>
            )}

            <button 
              onClick={handleSaveTrip}
              aria-label={isSaved ? "Remove from saved trips" : "Save this trip"}
              className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 backdrop-blur-md rounded-full font-semibold transition-all border group text-sm md:text-base focus:ring-2 focus:ring-teal-500 outline-none ${
                isSaved 
                ? 'bg-teal-600/90 hover:bg-teal-700 text-white border-teal-500' 
                : 'bg-black/40 hover:bg-black/60 text-white border-white/10 hover:border-teal-500/50'
              }`}
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isSaved ? 'Saved' : 'Save Trip'}
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-7xl mx-auto z-20">
          <div className="flex items-center gap-3 mb-4">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
               <MapPin className="w-3 h-3" /> {trip.country}
             </div>
             {trip.seasonality && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
                  <Leaf className="w-3 h-3" /> {trip.seasonality}
                </div>
             )}
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 md:mb-6 leading-tight tracking-tight drop-shadow-2xl break-words">
            {trip.destination}
          </h1>
          
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-[5px] md:px-5 md:py-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 pl-2">Dates</span>
                  <span className="text-lg md:text-xl font-bold pr-2">{tripDates}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-[5px] md:px-5 md:py-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 pl-2">Budget</span>
                  <span className="text-lg md:text-xl font-bold pr-2">{trip.totalEstimatedCost} {trip.currency}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-[5px] md:px-5 md:py-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 pl-2">Length</span>
                  <span className="text-lg md:text-xl font-bold pr-2">{trip.duration} Days</span>
              </div>
              
              {trip.dailyWeather && trip.dailyWeather.length > 0 && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-[5px] md:px-5 md:py-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-gray-400 pl-2">Avg Weather</span>
                  <div className="flex items-center gap-2 pr-2">
                     {getWeatherIcon(trip.dailyWeather[0].condition)}
                     <span className="text-lg md:text-xl font-bold">{trip.dailyWeather[0].temperature}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Weather Forecast Strip */}
            {trip.dailyWeather && trip.dailyWeather.length > 0 && (
              <div className="w-full overflow-x-auto pb-2 no-scrollbar" role="region" aria-label="Weather Forecast">
                <div className="flex gap-2">
                  {trip.dailyWeather.map((w, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm border border-white/5 rounded-lg px-3 py-2 min-w-[70px] shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Day {w.day}</span>
                      {getWeatherIcon(w.condition)}
                      <span className="text-xs font-bold text-white mt-1">{w.temperature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 md:-mt-12 relative z-30 space-y-12 md:space-y-16">
        
        {/* Intro & Flight Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mt-[4%]">
           {/* Left Column: Description & Transport */}
           <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl relative group/desc">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">The Experience</h3>
                    {!isEditingDesc ? (
                        <button 
                            onClick={() => setIsEditingDesc(true)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-teal-400 transition-colors opacity-0 group-hover/desc:opacity-100 focus:opacity-100"
                            title="Edit Description"
                            aria-label="Edit trip description"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="flex gap-2">
                             <button onClick={handleCancelDescription} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30" aria-label="Cancel editing">
                                <X className="w-4 h-4" />
                             </button>
                             <button onClick={handleSaveDescription} className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30" aria-label="Save description">
                                <Save className="w-4 h-4" />
                             </button>
                        </div>
                    )}
                </div>
                
                {isEditingDesc ? (
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-gray-300 text-sm md:text-base leading-relaxed focus:border-teal-500/50 outline-none resize-y min-h-[150px]"
                    />
                ) : (
                    <p className="text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap">{description}</p>
                )}
              </div>
              
              <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl">
                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2 mb-6">
                  <Car className="w-5 h-5" aria-hidden="true" /> Getting Around
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {trip.transportation?.length ? trip.transportation.map((option, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="p-2.5 bg-green-500/10 rounded-xl text-green-400 shrink-0">
                         {getTransportIcon(option.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-white text-sm">{option.type}</span>
                          <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">{option.cost}</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{option.description}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-gray-400 text-sm">Transport information available locally.</div>
                  )}
                </div>
              </div>
           </div>

           {/* Right Column: Flight Details */}
           <div className="lg:col-span-7">
             <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="flex items-center gap-3 text-xl font-bold text-white">
                    <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400"><Plane className="w-5 h-5" aria-hidden="true" /></div>
                    Flight Itinerary
                   </h3>
                   <div className="text-right">
                      <span className="block text-xs text-gray-500 uppercase">Total Flight Est.</span>
                      <span className="text-lg font-bold text-sky-400">{trip.flightInfo?.totalPrice || 'N/A'}</span>
                   </div>
                </div>
               
               {trip.flightInfo ? (
               <div className="space-y-12 relative flex-1 px-4">
                 {/* Timeline Vertical Graphic */}
                 <div className="absolute left-8 top-5 bottom-5 w-0.5 bg-gradient-to-b from-sky-500 via-slate-600 to-blue-500/80" aria-hidden="true"></div>

                 {/* Outbound Leg */}
                 <div className="relative pl-20 mb-10">
                   <div className="absolute left-8 top-0 -translate-x-1/2 p-2 bg-[#1e293b] border border-sky-500 rounded-full z-10 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)]" aria-hidden="true">
                      <PlaneTakeoff className="w-5 h-5" />
                   </div>
                   
                   <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block mb-3">Outbound Flight</span>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Date</h4>
                        <h1 className="text-2xl font-bold text-white">{outboundDate}</h1>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Time & Route</h4>
                        <h1 className="text-xl font-bold text-white">{trip.flightInfo.outboundRoute}</h1>
                      </div>
                   </div>

                   <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <div className="flex items-center gap-3">
                         <span className="text-xs text-gray-400 font-medium bg-white/5 px-2 py-1 rounded">{trip.flightInfo.airline}</span>
                         <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {trip.flightInfo.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-sky-500/70 uppercase">Price</span>
                        <span className="text-lg font-bold text-sky-400">{trip.flightInfo.outboundPrice}</span>
                     </div>
                   </div>
                 </div>

                 {/* Layover Step */}
                 <div className="relative pl-20 mb-10">
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 p-2 bg-[#1e293b] border border-gray-500 rounded-full z-10 text-gray-400" aria-hidden="true">
                         <Clock className="w-5 h-5" />
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-dashed border-white/10 flex items-start gap-3 relative">
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white/5 border-l border-b border-white/10 rotate-45" aria-hidden="true"></div>
                        
                        <div className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg mt-0.5 shrink-0">
                          <Split className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Connection / Layovers</span>
                          <p className="text-gray-300 text-sm">{trip.flightInfo.layovers || 'Direct Flight'}</p>
                        </div>
                    </div>
                 </div>

                 {/* Return Leg */}
                 <div className="relative pl-20">
                   <div className="absolute left-8 top-0 -translate-x-1/2 p-2 bg-[#1e293b] border border-blue-500 rounded-full z-10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]" aria-hidden="true">
                      <PlaneLanding className="w-5 h-5" />
                   </div>
                   
                   <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-3">Return Flight</span>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Date</h4>
                        <h1 className="text-2xl font-bold text-white">{returnDate}</h1>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Time & Route</h4>
                        <h1 className="text-xl font-bold text-white">{trip.flightInfo.returnRoute}</h1>
                      </div>
                   </div>

                   <div className="flex justify-between items-center border-t border-white/5 pt-3">
                       <span className="text-xs text-gray-500 font-medium">Included in Total Estimate</span>
                       <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-blue-500/70 uppercase">Price</span>
                          <span className="text-lg font-bold text-blue-400">{trip.flightInfo.returnPrice}</span>
                       </div>
                   </div>
                 </div>
               </div>
               ) : (
                 <div className="text-gray-400">Flight details unavailable.</div>
               )}

                {/* Flexible Dates - Split Layout */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" aria-hidden="true" /> Nearby Dates & Prices
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Outbound Flexibility */}
                    {trip.flightInfo?.outboundFlexibleDates && (
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-3 text-sky-400">
                          <PlaneTakeoff className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs font-bold uppercase">Outbound Flex</span>
                        </div>
                        <div className="space-y-2">
                          {trip.flightInfo.outboundFlexibleDates.map((fd, i) => (
                             <div key={i} className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2 border border-white/5 hover:border-sky-500/30 transition-colors cursor-pointer">
                               <span className="text-xs text-gray-300 font-medium">{fd.date}</span>
                               <span className="text-xs font-bold text-sky-400">{fd.price}</span>
                             </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Return Flexibility */}
                    {trip.flightInfo?.returnFlexibleDates && (
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-3 text-blue-400">
                          <PlaneLanding className="w-4 h-4" aria-hidden="true" />
                          <span className="text-xs font-bold uppercase">Return Flex</span>
                        </div>
                        <div className="space-y-2">
                          {trip.flightInfo.returnFlexibleDates.map((fd, i) => (
                             <div key={i} className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2 border border-white/5 hover:border-blue-500/30 transition-colors cursor-pointer">
                               <span className="text-xs text-gray-300 font-medium">{fd.date}</span>
                               <span className="text-xs font-bold text-blue-400">{fd.price}</span>
                             </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Book Flight Button */}
                <button
                   onClick={handleBookFlight}
                   className="w-full mt-6 py-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 font-bold flex items-center justify-center gap-2 transition-all border border-sky-600/30 shadow-lg hover:shadow-sky-500/20 focus:ring-2 focus:ring-sky-500 outline-none"
                   aria-label={`Book flights on ${trip.flightInfo?.airline || 'Airline'} website`}
                >
                   Book on {trip.flightInfo?.airline || 'Airline'} Website <ExternalLink className="w-4 h-4" />
                </button>

             </div>
           </div>
        </div>

        {/* Accommodations Grid */}
        <section aria-label="Accommodation Options">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-2">
                  <div className="p-2 bg-teal-500/20 rounded-xl text-teal-400"><Hotel className="w-6 h-6" aria-hidden="true" /></div>
                  Where to Stay
                </h3>
                <p className="text-gray-400 text-sm">
                   {loadingStays ? 'Searching for live hotel deals...' : `Found ${processedAccommodations.length} matches.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                 {/* Sort Dropdown */}
                 <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <select 
                      value={accSort} 
                      onChange={(e) => setAccSort(e.target.value as any)}
                      aria-label="Sort accommodations"
                      className="bg-transparent text-white text-sm outline-none cursor-pointer [&>option]:bg-slate-800"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                 </div>

                 {/* Filter Toggle Button */}
                 <button 
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    aria-expanded={isFiltersOpen}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                      isFiltersOpen 
                        ? 'bg-teal-600 text-white border-teal-500' 
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </button>
              </div>
           </div>

           {/* Filter Panel */}
           <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFiltersOpen ? 'max-h-[600px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
              <div className="bg-[#1e293b]/90 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    
                    {/* Type Filter */}
                    <div className="md:col-span-1">
                       <label className="text-xs font-bold uppercase text-gray-500 mb-3 block">Property Type</label>
                       <div className="flex flex-wrap gap-2">
                          {availableTypes.map(type => (
                            <button
                              key={type}
                              onClick={() => toggleFilterType(type)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                selectedTypes.includes(type)
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                                  : 'bg-black/20 text-gray-400 border-transparent hover:bg-white/5'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* Price Filter */}
                    <div className="md:col-span-1">
                       <div className="flex justify-between items-center mb-3">
                         <label className="text-xs font-bold uppercase text-gray-500">Max Price / Night</label>
                         <span className="text-sm font-bold text-teal-400">{maxPrice}</span>
                       </div>
                       <input 
                         type="range"
                         min="0"
                         max={Math.ceil(stats.maxPrice * 1.5)} // Allow slightly higher than current max
                         value={maxPrice}
                         onChange={(e) => setMaxPrice(Number(e.target.value))}
                         className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400"
                         aria-label="Max price range slider"
                       />
                       <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-bold">
                          <span>0</span>
                          <span>{Math.ceil(stats.maxPrice * 1.5)}</span>
                       </div>
                    </div>

                    {/* Distance Filter */}
                     <div className="md:col-span-1">
                       <div className="flex justify-between items-center mb-3">
                         <label className="text-xs font-bold uppercase text-gray-500">Max Dist. from Center</label>
                         <span className="text-sm font-bold text-teal-400">{maxDistance} km</span>
                       </div>
                       <input 
                         type="range"
                         min="1"
                         max={Math.max(20, stats.maxDist + 5)}
                         value={maxDistance}
                         onChange={(e) => setMaxDistance(Number(e.target.value))}
                         className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400"
                         aria-label="Max distance range slider"
                       />
                       <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-bold">
                          <span>1 km</span>
                          <span>{Math.max(20, stats.maxDist + 5)} km</span>
                       </div>
                    </div>

                    {/* Rating/Star Filter */}
                    <div className="md:col-span-1">
                       <label className="text-xs font-bold uppercase text-gray-500 mb-3 block">Guest Rating / Class</label>
                       <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setMinRating(minRating === star ? 0 : star)}
                              aria-label={`Filter by ${star} stars`}
                              className={`p-2 rounded-lg transition-all ${
                                star <= minRating
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-black/20 text-gray-600 hover:bg-white/5'
                              }`}
                            >
                              <Star className={`w-5 h-5 ${star <= minRating ? 'fill-current' : ''}`} aria-hidden="true" />
                            </button>
                          ))}
                       </div>
                       <p className="text-[10px] text-gray-500 mt-2">Filter by star rating or equivalent guest score.</p>
                    </div>

                 </div>
              </div>
           </div>
            
           {/* Accommodation Loading State */}
           {loadingStays && (
               <div className="py-20 text-center">
                   <div className="inline-block p-4 rounded-full bg-white/5 mb-4 animate-pulse">
                       <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                   </div>
                   <p className="text-gray-400 font-medium animate-pulse">Fetching live hotel deals from Google...</p>
               </div>
           )}

           {!loadingStays && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {processedAccommodations.length > 0 ? (
                processedAccommodations.slice(0, visibleAccommodations).map((acc, idx) => (
                  <AccommodationCard 
                    key={idx} 
                    acc={acc} 
                    cityCenter={trip.coordinates} 
                    bookingContext={{
                      travelers: trip.travelers || 1,
                      startDate: trip.startDate,
                      duration: trip.duration,
                      currency: trip.currency
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center bg-white/5 rounded-3xl border border-white/5 border-dashed">
                   <p className="text-gray-400 font-medium">No accommodations match your current filters.</p>
                   <button 
                     onClick={() => { setSelectedTypes([]); setMaxPrice(Math.ceil(stats.maxPrice)); setMinRating(0); setMaxDistance(stats.maxDist); }}
                     className="mt-4 text-teal-400 text-sm font-bold hover:underline"
                   >
                     Reset Filters
                   </button>
                </div>
              )}
           </div>
           )}
           
           {/* Load More Button */}
           {!loadingStays && processedAccommodations.length > visibleAccommodations && (
             <div className="mt-8 text-center">
               <button 
                 onClick={handleLoadMore}
                 className="px-8 py-3 rounded-full bg-gradient-to-r from-teal-600 to-blue-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-teal-500/25 transition-all transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
               >
                 <Plus className="w-4 h-4" /> Load More Stays
               </button>
             </div>
           )}
        </section>

        {/* Itinerary Timeline */}
        <section className="pb-8" aria-label="Day by Day Itinerary">
           <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-10">
             <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400"><Calendar className="w-6 h-6" aria-hidden="true" /></div>
             Day by Day Plan
           </h3>
           
           <div className="relative max-w-4xl mx-auto">
              {/* Timeline Line - adjusted position for mobile */}
              <div className="absolute left-[19px] md:left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-orange-500/50 via-orange-500/10 to-transparent border-l border-dashed border-orange-500/30" aria-hidden="true"></div>
              
              {trip.detailedItinerary?.map((day, idx) => {
                 const bCost = parsePrice(day.expenses?.breakfast);
                 const lCost = parsePrice(day.expenses?.lunch);
                 const dCost = parsePrice(day.expenses?.dinner);
                 const tCost = parsePrice(day.expenses?.transport);
                 
                 // Determine max for bar chart scaling
                 const maxVal = Math.max(bCost, lCost, dCost, tCost, 1);

                 const chartData = [
                   { label: 'Breakfast', val: bCost, display: day.expenses?.breakfast, icon: Coffee, color: 'bg-yellow-400' },
                   { label: 'Lunch', val: lCost, display: day.expenses?.lunch, icon: Utensils, color: 'bg-orange-400' },
                   { label: 'Dinner', val: dCost, display: day.expenses?.dinner, icon: Wine, color: 'bg-pink-400' },
                   { label: 'Transport', val: tCost, display: day.expenses?.transport, icon: Bus, color: 'bg-blue-400' },
                 ];

                 return (
                <article key={idx} className="relative pl-10 md:pl-16 mb-10 group last:mb-0">
                   {/* Day Number Badge */}
                   <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#0f172a] border-2 border-orange-500 flex items-center justify-center text-orange-500 font-bold text-sm z-10 shadow-[0_0_15px_rgba(249,115,22,0.4)] group-hover:scale-110 transition-transform">
                     {day.day}
                   </div>
                   
                   <div className="bg-[#1e293b] rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all shadow-lg group-hover:translate-x-1 overflow-hidden">
                      
                      {/* Header */}
                      <div className="p-6 border-b border-white/5 flex justify-between items-start">
                        <h4 className="text-lg font-bold text-white">{day.title}</h4>
                      </div>

                      {/* Activities List */}
                      <div className="p-6 space-y-5">
                         {day.activities?.map((act, i) => (
                           <div key={i} className="flex gap-4 relative group/act">
                              <div className="w-16 md:w-20 shrink-0 pt-0.5">
                                <span className="text-xs md:text-sm font-bold text-orange-400/80">{act.time}</span>
                              </div>
                              <div className="relative pl-5 border-l border-white/10 flex-1">
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/20" aria-hidden="true"></div>
                                <div className="flex items-start gap-3">
                                   <div className="p-1.5 bg-white/5 rounded-lg text-gray-400 mt-0.5 shrink-0">
                                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                   </div>
                                   <div className="flex-1">
                                      <p className="text-gray-300 text-sm leading-relaxed py-1">{act.description}</p>
                                   </div>
                                   {/* TripAdvisor Activity Link */}
                                   <a 
                                      href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(act.description + ' ' + trip.destination)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="opacity-0 group-hover/act:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white"
                                      title="Check Reviews on TripAdvisor"
                                      aria-label={`Check TripAdvisor reviews for ${act.description}`}
                                   >
                                      <ExternalLink className="w-3 h-3" />
                                   </a>
                                </div>
                              </div>
                           </div>
                         ))}
                      </div>

                      {/* Daily Expenses Footer with Interactive Bar Chart */}
                      {day.expenses && (
                        <div className="px-4 md:px-6 py-6 bg-black/20 border-t border-white/5">
                          <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-8">Cost Breakdown (Interactive)</h5>
                          
                          <div className="flex justify-around items-end h-32 gap-2 sm:gap-6 px-4" role="img" aria-label="Bar chart showing daily expenses">
                            {chartData.map((item, i) => (
                              <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-3 group/bar relative">
                                {/* Hover Tooltip */}
                                <div className="absolute -top-10 bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all transform translate-y-2 group-hover/bar:translate-y-0 shadow-xl z-20 pointer-events-none">
                                  {item.display}
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
                                </div>
                                
                                {/* Bar Container */}
                                <div className="w-full max-w-[40px] h-full flex items-end justify-center relative">
                                    {/* The Bar */}
                                    <div 
                                    className={`w-full rounded-t-lg transition-all duration-700 ease-out ${item.color} opacity-80 group-hover/bar:opacity-100 group-hover/bar:scale-x-110 origin-bottom shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
                                    style={{ height: `${Math.max((item.val / maxVal) * 100, 5)}%` }}
                                    aria-label={`${item.label}: ${item.display}`}
                                    ></div>
                                </div>
                                
                                {/* Icon/Label */}
                                <div className="text-gray-500 flex flex-col items-center gap-1">
                                  <item.icon className="w-4 h-4" aria-hidden="true" />
                                  <span className="text-[9px] uppercase font-bold tracking-wider hidden sm:block">{item.label}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-6 mt-4 border-t border-white/5">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Estimated Daily Cost</span>
                             <span className="text-lg font-bold text-green-400">{day.expenses.totalDaily}</span>
                          </div>
                        </div>
                      )}
                   </div>
                </article>
               );
              })}
           </div>
        </section>

        {/* Local Activities & Tours Section */}
        {trip.localActivities && trip.localActivities.length > 0 && (
          <section className="pb-20" aria-label="Local Activities and Tours">
             <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-8">
               <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400"><Ticket className="w-6 h-6" aria-hidden="true" /></div>
               Popular Local Experiences
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trip.localActivities.map((activity, idx) => (
                  <ActivityCard key={idx} activity={activity} destination={trip.destination} index={idx} />
                ))}
             </div>
          </section>
        )}

      </div>
    </div>
  );
};
