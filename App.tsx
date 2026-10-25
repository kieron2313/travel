import React, { useState, useEffect, useCallback } from 'react';
import { SearchForm } from './components/SearchForm';
import { TripCard } from './components/TripCard';
import { TripDetailsPage } from './components/TripDetailsPage';
import { QuotaModal } from './components/QuotaModal';
import { SearchParams, TripSuggestion, QuotaInfo } from './types';
import { generateTripSuggestions, fetchQuotaInfo } from './services/geminiService';
import { Globe, ArrowLeft, ArrowUpDown, Clock, DollarSign, Euro, PoundSterling, JapaneseYen, SwissFranc, Activity, Sparkles, RefreshCw } from 'lucide-react';

type SortOption = 'price_asc' | 'price_desc' | 'duration_asc' | 'duration_desc';
type ViewState = 'search' | 'results' | 'details';

const STORAGE_KEYS = {
  SUGGESTIONS: 'btp_suggestions',
  SELECTED_TRIP: 'btp_selectedTrip',
  VIEW: 'btp_view',
  SORT: 'btp_sort'
};

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [suggestions, setSuggestions] = useState<TripSuggestion[] | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [selectedTrip, setSelectedTrip] = useState<TripSuggestion | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_TRIP);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [view, setView] = useState<ViewState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW);
      return saved ? JSON.parse(saved) : 'search';
    } catch { return 'search'; }
  });

  const [sortOption, setSortOption] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SORT);
      return saved ? JSON.parse(saved) : 'price_asc';
    } catch { return 'price_asc'; }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quota & Usage Dashboard State
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [isQuotaLoading, setIsQuotaLoading] = useState(false);

  const loadQuota = useCallback(async () => {
    setIsQuotaLoading(true);
    try {
      const data = await fetchQuotaInfo();
      if (data) setQuota(data);
    } catch (err) {
      console.warn("Could not load quota:", err);
    } finally {
      setIsQuotaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuota();
    // Poll quota every 60 seconds
    const interval = setInterval(loadQuota, 60000);
    return () => clearInterval(interval);
  }, [loadQuota]);

  // Persist state changes to localStorage
  useEffect(() => {
    if (suggestions) {
      localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(suggestions));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SUGGESTIONS);
    }
  }, [suggestions]);

  useEffect(() => {
    if (selectedTrip) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_TRIP, JSON.stringify(selectedTrip));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_TRIP);
    }
  }, [selectedTrip]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW, JSON.stringify(view));
  }, [view]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT, JSON.stringify(sortOption));
  }, [sortOption]);

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await generateTripSuggestions(params);
      setSuggestions(results);
      setView('results');
      setSortOption('price_asc'); // Default sort
      // Refresh quota after new search
      loadQuota();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setView('search');
    setSuggestions(null);
    setSelectedTrip(null);
  };

  const handleSelectTrip = (trip: TripSuggestion) => {
    setSelectedTrip(trip);
    setView('details');
    window.scrollTo(0, 0);
  };

  const handleBackToResults = () => {
    setSelectedTrip(null);
    setView('results');
  };

  const getSortedSuggestions = () => {
    if (!suggestions) return [];
    
    return [...suggestions].sort((a, b) => {
      switch (sortOption) {
        case 'price_asc':
          return a.totalEstimatedCost - b.totalEstimatedCost;
        case 'price_desc':
          return b.totalEstimatedCost - a.totalEstimatedCost;
        case 'duration_asc':
          return a.duration - b.duration;
        case 'duration_desc':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });
  };

  const getCurrencyIcon = (curr: string) => {
    const className = "w-4 h-4";
    switch (curr) {
      case 'EUR': return <Euro className={className} />;
      case 'GBP': return <PoundSterling className={className} />;
      case 'JPY': return <JapaneseYen className={className} />;
      case 'CHF': return <SwissFranc className={className} />;
      default: return <DollarSign className={className} />;
    }
  };

  const sortedSuggestions = getSortedSuggestions();
  const resultCurrency = suggestions?.[0]?.currency || 'USD';

  // If in details view, render the page directly
  if (view === 'details' && selectedTrip) {
    return (
      <>
        <TripDetailsPage 
          trip={selectedTrip} 
          onBack={handleBackToResults} 
          onOpenQuota={() => setIsQuotaOpen(true)}
          quota={quota}
        />
        <QuotaModal
          isOpen={isQuotaOpen}
          onClose={() => setIsQuotaOpen(false)}
          quota={quota}
          isLoading={isQuotaLoading}
          onRefresh={loadQuota}
        />
      </>
    );
  }

  const serpLeft = quota?.serpApi?.searchesLeft ?? 250;
  const serpTotal = quota?.serpApi?.totalSearches ?? 250;

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-950 via-slate-950 to-black relative overflow-x-hidden">
      
      {/* Ambient Background blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-800/20 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-800/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-20 w-full px-4 md:px-6 py-6 flex items-center justify-between max-w-[100rem] mx-auto">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
          <div className="bg-gradient-to-tr from-teal-500 to-cyan-600 p-2 md:p-2.5 rounded-xl shadow-lg group-hover:shadow-teal-500/30 transition-all">
            <Globe className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Budget Trip <span className="text-teal-400">Planner</span></span>
        </div>

        {/* Action Header Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quota & Usage Button */}
          <button
            onClick={() => setIsQuotaOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs md:text-sm font-semibold text-gray-200 hover:text-white transition-all border border-white/10 hover:border-teal-500/40 shadow-lg group"
            title="View total quota and searches left"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline text-gray-400 font-normal">Quota:</span>
            <span className="font-bold text-teal-300">
              {quota ? `${serpLeft}/${serpTotal} Left` : 'Quota'}
            </span>
          </button>

          {view === 'results' && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs md:text-sm font-medium text-gray-300 hover:text-white transition-all border border-white/5"
            >
              <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">New Search</span><span className="sm:hidden">Back</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8 pb-24">
        
        {view === 'search' ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
             {error && (
               <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-200 rounded-xl max-w-lg text-center animate-bounce">
                 {error}
               </div>
             )}
             <SearchForm 
               onSearch={handleSearch} 
               isLoading={isLoading} 
               quota={quota} 
               onOpenQuota={() => setIsQuotaOpen(true)} 
             />
          </div>
        ) : (
          <div className="animate-fadeIn max-w-[100rem] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 lg:mb-10 gap-6">
              <div>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3">Your Curated Adventures</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-base md:text-lg text-gray-400">Found {suggestions?.length} perfect matches for your budget.</p>
                  {quota && (
                    <span 
                      onClick={() => setIsQuotaOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 font-semibold cursor-pointer hover:bg-teal-500/20 transition-all"
                    >
                      <Sparkles className="w-3 h-3" /> {quota.serpApi.searchesLeft} Searches Remaining • {quota.gemini.requestsLeftToday} AI Calls Left
                    </span>
                  )}
                </div>
              </div>

              {/* Sorting Controls */}
              <div className="w-full lg:w-auto overflow-x-auto">
                <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md min-w-max">
                   <span className="text-xs font-bold uppercase text-gray-500 px-3">Sort By</span>
                   
                   <div className="flex gap-1">
                     <button 
                       onClick={() => setSortOption(sortOption === 'price_asc' ? 'price_desc' : 'price_asc')}
                       className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                         sortOption.startsWith('price') 
                           ? 'bg-teal-600 text-white shadow-lg' 
                           : 'hover:bg-white/5 text-gray-400 hover:text-white'
                       }`}
                     >
                       {getCurrencyIcon(resultCurrency)}
                       Price
                       {sortOption === 'price_asc' && <ArrowUpDown className="w-3 h-3 opacity-70" />}
                       {sortOption === 'price_desc' && <ArrowUpDown className="w-3 h-3 opacity-70 rotate-180" />}
                     </button>

                     <button 
                       onClick={() => setSortOption(sortOption === 'duration_asc' ? 'duration_desc' : 'duration_asc')}
                       className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                         sortOption.startsWith('duration') 
                           ? 'bg-blue-600 text-white shadow-lg' 
                           : 'hover:bg-white/5 text-gray-400 hover:text-white'
                       }`}
                     >
                       <Clock className="w-4 h-4" />
                       Duration
                       {sortOption === 'duration_asc' && <ArrowUpDown className="w-3 h-3 opacity-70" />}
                       {sortOption === 'duration_desc' && <ArrowUpDown className="w-3 h-3 opacity-70 rotate-180" />}
                     </button>
                   </div>
                </div>
              </div>
            </div>

            {sortedSuggestions && sortedSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {sortedSuggestions.map((trip, index) => (
                  <div key={`${trip.destination}-${index}`} style={{ animationDelay: `${index * 75}ms` }} className="animate-slideUp h-full">
                    <TripCard trip={trip} index={index} onClick={handleSelectTrip} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/10">
                 <p className="text-2xl text-gray-400">No distinct trips found for this strict budget.</p>
                 <button onClick={handleReset} className="mt-6 text-teal-400 hover:text-teal-300 underline font-medium">Try adjusting your parameters</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quota & Usage Modal */}
      <QuotaModal
        isOpen={isQuotaOpen}
        onClose={() => setIsQuotaOpen(false)}
        quota={quota}
        isLoading={isQuotaLoading}
        onRefresh={loadQuota}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default App;