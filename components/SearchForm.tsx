
import React, { useState, useEffect } from 'react';
import { SearchParams, AccommodationType, INTEREST_TAGS, QuotaInfo } from '../types';
import { Search, DollarSign, Clock, Bed, PlaneTakeoff, PlaneLanding, Euro, PoundSterling, JapaneseYen, SwissFranc, Locate, Loader2, Users, Palmtree, Hourglass, Map, Calendar, ArrowRight, CalendarRange, Activity } from 'lucide-react';
import { getCityFromCoordinates } from '../services/geminiService';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  quota?: QuotaInfo | null;
  onOpenQuota?: () => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading, quota, onOpenQuota }) => {
  // Date Logic Helpers
  const today = new Date();
  
  // Calculate min date (today + 3 days) for date picker
  const minDateObj = new Date(today);
  minDateObj.setDate(today.getDate() + 3);
  const minDateStr = minDateObj.toISOString().split('T')[0];
  
  // Default end date (min + 30 days) - A wider window by default now
  const defaultEndObj = new Date(minDateObj);
  defaultEndObj.setDate(minDateObj.getDate() + 30);
  const defaultEndDateStr = defaultEndObj.toISOString().split('T')[0];

  const [origin, setOrigin] = useState('New York');
  const [isLocating, setIsLocating] = useState(false);
  const [destination, setDestination] = useState(''); // Empty means "Anywhere"
  
  // Manual Duration State
  const [duration, setDuration] = useState(7);

  // Search Window State
  const [startDate, setStartDate] = useState(minDateStr);
  const [endDate, setEndDate] = useState(defaultEndDateStr);
  
  // Auto-extend end date if window < duration
  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < duration) {
        // Extend end date to satisfy duration
        const newEnd = new Date(start);
        newEnd.setDate(newEnd.getDate() + duration);
        setEndDate(newEnd.toISOString().split('T')[0]);
    }
  }, [startDate, duration]);

  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState(1500);
  const [currency, setCurrency] = useState('EUR');
  const [accommodations, setAccommodations] = useState<AccommodationType[]>([AccommodationType.HOTEL]);
  const [maxDistance, setMaxDistance] = useState(5); // Default 5km
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    // End date effect will trigger automatically
  };

  const toggleAccommodation = (type: AccommodationType) => {
    setAccommodations(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleInterest = (tag: string) => {
    setInterests(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        alert("For security reasons, location services require a secure HTTPS connection.");
        return;
    }

    setIsLocating(true);

    const onPositionSuccess = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude } = position.coords;
        const city = await getCityFromCoordinates(latitude, longitude);
        if (city) {
          setOrigin(city);
        } else {
          alert("We found your coordinates but couldn't identify the city name. Please enter it manually.");
        }
      } catch (err) {
        console.error(err);
        alert("Error identifying city from location.");
      } finally {
        setIsLocating(false);
      }
    };

    const attemptHighAccuracy = () => {
      console.log("Low accuracy failed/unavailable. Retrying with High Accuracy (GPS)...");
      navigator.geolocation.getCurrentPosition(
        onPositionSuccess,
        (error) => {
           setIsLocating(false);
           console.warn("High Accuracy Location error:", error);
           let msg = "Could not retrieve location.";
           if (error.code === 1) msg = "Location access denied. Please allow location permission in your browser settings.";
           else if (error.code === 2) msg = "Location unavailable. Please check your device connection.";
           alert(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      (error) => {
        console.warn("Low Accuracy failed", error);
        attemptHighAccuracy();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalInterests = customInterest ? [...interests, customInterest] : interests;
    
    onSearch({
      origin,
      destination,
      startDate,
      endDate,
      duration,
      travelers,
      budget,
      currency,
      accommodations,
      interests: finalInterests.join(", "),
      maxDistanceFromCenter: maxDistance
    });
  };

  const getCurrencyIcon = (curr: string) => {
    switch (curr) {
      case 'EUR': return <Euro className="w-5 h-5 text-teal-400" />;
      case 'GBP': return <PoundSterling className="w-5 h-5 text-teal-400" />;
      case 'JPY': return <JapaneseYen className="w-5 h-5 text-teal-400" />;
      case 'CHF': return <SwissFranc className="w-5 h-5 text-teal-400" />;
      case 'USD': default: return <DollarSign className="w-5 h-5 text-teal-400" />;
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-fadeIn">
      <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
        
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-4xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 tracking-tighter mb-[2%]">
            Design Your Journey
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto font-light px-2 mb-4">
            Tell us where, when, and how long, and we'll plan the rest.
          </p>

          {quota && (
            <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-xs sm:text-sm text-gray-300 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-gray-400">Total Quota:</span>
                <span className="font-bold text-white">{quota.serpApi.totalSearches}</span>
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Searches Left:</span>
                <span className="font-extrabold text-teal-400">{quota.serpApi.searchesLeft}</span>
              </div>
              <span className="text-white/20 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <span className="text-gray-400">Gemini AI:</span>
                <span className="font-semibold text-cyan-300">{quota.gemini.requestsLeftToday} daily calls left</span>
              </div>
              {onOpenQuota && (
                <button
                  type="button"
                  onClick={onOpenQuota}
                  className="ml-1 text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <Activity className="w-3.5 h-3.5" /> Details
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main Search Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          
          {/* Origin - Spans 3 cols */}
          <div className="md:col-span-3 group">
             <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 pl-4">Flying from</label>
             <div className="relative flex items-center bg-white/5 rounded-3xl hover:bg-white/10 transition-all group-focus-within:bg-white/10 group-focus-within:ring-2 group-focus-within:ring-teal-500/30">
                <div className="pl-5 text-gray-400">
                  <PlaneTakeoff className="h-6 w-6" />
                </div>
                <input
                  type="text"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full pl-3 pr-12 py-4 md:py-5 bg-transparent text-white placeholder-gray-600 outline-none font-semibold text-lg"
                  placeholder="City"
                />
                <button
                  type="button"
                  onClick={handleLocationClick}
                  disabled={isLocating}
                  className="absolute right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-teal-400 transition-colors disabled:opacity-50"
                  title="Use my GPS location"
                >
                  {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Locate className="h-5 w-5" />}
                </button>
             </div>
          </div>

          {/* Destination - Spans 4 cols */}
          <div className="md:col-span-4 group">
             <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 pl-4">Flying to</label>
             <div className="relative flex items-center bg-white/5 rounded-3xl hover:bg-white/10 transition-all group-focus-within:bg-white/10 group-focus-within:ring-2 group-focus-within:ring-teal-500/30">
                <div className="pl-5 text-gray-400">
                  <PlaneLanding className="h-6 w-6" />
                </div>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-3 pr-6 py-4 md:py-5 bg-transparent text-white placeholder-gray-600 outline-none font-semibold text-lg"
                  placeholder="Anywhere in the world"
                />
             </div>
          </div>

          {/* TRAVEL PERIOD WINDOW - Spans 5 cols */}
          <div className="md:col-span-5 group">
             <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 pl-4 flex items-center gap-2">
               <CalendarRange className="w-4 h-4 text-teal-400" /> Travel Period
             </label>
             <div className="flex flex-col sm:flex-row sm:items-center bg-white/5 rounded-3xl hover:bg-white/10 transition-all px-4 py-2 group-focus-within:bg-white/10 group-focus-within:ring-2 group-focus-within:ring-teal-500/30 min-h-[72px]">
                <div className="hidden sm:block text-gray-400 mr-2">
                   <Calendar className="h-6 w-6" />
                </div>
                
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                        <label className="text-[9px] uppercase font-bold text-teal-400 block ml-1 mb-0.5">From</label>
                        <input 
                        type="date"
                        min={minDateStr}
                        value={startDate}
                        onChange={handleStartDateChange}
                        className="bg-transparent text-white text-lg font-semibold outline-none cursor-pointer w-full hover:text-teal-400 transition-colors py-1 [color-scheme:dark]"
                        />
                    </div>
                    <div className="text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <label className="text-[9px] uppercase font-bold text-blue-400 block ml-1 mb-0.5">Until</label>
                        <input 
                        type="date"
                        min={startDate}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-white text-lg font-semibold outline-none cursor-pointer w-full hover:text-blue-400 transition-colors py-1 [color-scheme:dark]"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Secondary Row: Budget, Travelers, Duration (Manual) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Budget & Currency Section */}
          <div className="lg:col-span-1 bg-white/5 rounded-3xl p-6 md:p-8 border border-white/5 hover:border-white/10 transition-all">
              <div className="flex flex-col h-full justify-between gap-6">
                 <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
                    {getCurrencyIcon(currency)} Max Budget
                 </label>
                 
                 <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-2 border border-white/10 focus-within:border-teal-500/50 transition-colors">
                    <input 
                      type="number" 
                      min="100" 
                      step="50"
                      value={budget} 
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full bg-transparent text-right text-2xl font-bold text-white outline-none appearance-none m-0"
                    />
                    <span className="text-xl font-medium text-gray-400">{currency}</span>
                 </div>

                 {/* Inline Currency Selector */}
                 <div className="flex flex-wrap gap-1.5">
                  {CURRENCIES.map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrency(curr)}
                      className={`flex-1 min-w-[40px] py-2 md:py-1.5 rounded-lg text-xs md:text-[10px] font-bold transition-all duration-200 ${
                        currency === curr
                          ? 'bg-white text-slate-900 shadow-lg'
                          : 'bg-slate-800/40 text-gray-500 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
          </div>

          {/* Travelers Input */}
          <div className="lg:col-span-1 bg-white/5 rounded-3xl p-6 md:p-8 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-center">
              <div className="flex justify-between items-end mb-6">
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
                  <Users className="w-5 h-5 text-orange-400" /> Travelers
                </label>
                <span className="text-3xl font-bold text-white">{travelers}</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setTravelers(Math.max(1, travelers - 1))}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl font-bold text-white transition-colors"
                >
                  -
                </button>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${(travelers / 10) * 100}%` }}></div>
                </div>
                <button 
                  type="button"
                  onClick={() => setTravelers(Math.min(10, travelers + 1))}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl font-bold text-white transition-colors"
                >
                  +
                </button>
              </div>
          </div>

          {/* Duration Input (Manual) */}
          <div className="lg:col-span-1 bg-white/5 rounded-3xl p-6 md:p-8 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-center">
             <div className="flex justify-between items-end mb-6">
                <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
                  <Clock className="w-5 h-5 text-teal-400" /> Duration
                </label>
                <span className="text-3xl font-bold text-white">{duration} <span className="text-lg font-normal text-gray-500">Days</span></span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setDuration(Math.max(1, duration - 1))}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl font-bold text-white transition-colors"
                >
                  -
                </button>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${(duration / 30) * 100}%` }}></div>
                </div>
                <button 
                  type="button"
                  onClick={() => setDuration(Math.min(30, duration + 1))}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl font-bold text-white transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                 Make sure your search window has at least {duration} days.
              </p>
          </div>

        </div>

        {/* Preferences Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Accommodations (5 cols) */}
            <div className="lg:col-span-5 bg-white/5 rounded-3xl p-6 border border-white/5">
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                 <Bed className="w-4 h-4 text-blue-400" /> Preferred Stays
               </label>
               <div className="flex flex-wrap gap-2 mb-6">
                 {Object.values(AccommodationType).map((type) => {
                   const isSelected = accommodations.includes(type);
                   return (
                     <button
                        key={type}
                        type="button"
                        onClick={() => toggleAccommodation(type)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent ${
                          isSelected 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 transform -translate-y-0.5' 
                          : 'bg-slate-800/40 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10'
                        }`}
                     >
                       {type}
                     </button>
                   );
                 })}
               </div>

               {/* Max Distance Slider */}
               <div className="pt-2 border-t border-white/5">
                 <div className="flex justify-between items-center mb-3">
                   <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                     <Map className="w-4 h-4 text-teal-400" /> Max Distance from Center
                   </label>
                   <span className="text-sm font-bold text-teal-400">{maxDistance} km</span>
                 </div>
                 <input 
                    type="range" min="1" max="20" step="1"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400"
                 />
                 <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                   <span>City Center</span>
                   <span>Outskirts (20km)</span>
                 </div>
               </div>
            </div>

            {/* Interests (7 cols) */}
            <div className="lg:col-span-7 bg-white/5 rounded-3xl p-6 border border-white/5">
               <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                 <Palmtree className="w-4 h-4 text-orange-400" /> Trip Vibe
               </label>
               <div className="flex flex-wrap gap-2 mb-4">
                 {INTEREST_TAGS.map((tag) => {
                   const isSelected = interests.includes(tag);
                   return (
                     <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border border-transparent ${
                          isSelected 
                          ? 'bg-orange-500 text-black shadow-lg shadow-orange-900/20 transform -translate-y-0.5' 
                          : 'bg-slate-800/40 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10'
                        }`}
                     >
                       {tag}
                     </button>
                   );
                 })}
               </div>
               <div className="relative">
                <input 
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  placeholder="Or type anything specific... (e.g. 'Cyberpunk architecture', 'Vegan food tour')"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-teal-500/50 focus:bg-white/10 outline-none transition-all text-sm"
                />
               </div>
            </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 md:pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-5 md:py-6 rounded-3xl font-bold text-white shadow-2xl hover:shadow-teal-500/25 transition-all transform hover:-translate-y-1 hover:scale-[1.01] ${
                isLoading 
                ? 'bg-slate-800 cursor-not-allowed opacity-50 text-lg md:text-xl'
                : 'bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-xl md:text-2xl'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3 text-center px-4">
                  <div className="w-5 h-5 md:w-6 md:h-6 border-4 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span className="text-sm md:text-lg">Please be patient. We are creating your budget dream trip.</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Search className="w-6 h-6" /> Find My Trip
                </span>
              )}
            </button>
        </div>

      </form>
    </div>
  );
};
