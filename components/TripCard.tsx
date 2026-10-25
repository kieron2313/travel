import React, { useState } from 'react';
import { TripSuggestion } from '../types';
import { Plane, Hotel, MapPin, Clock, ArrowRight, Home, Tent, Palmtree, Building2, BedDouble, Building, Car } from 'lucide-react';

interface TripCardProps {
  trip: TripSuggestion;
  index: number;
  onClick: (trip: TripSuggestion) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, index, onClick }) => {
  // Use Pollinations AI for specific destination imagery
  const encodedDest = encodeURIComponent(`${trip.destination || 'Travel'} ${trip.country || ''} landmark scenery`);
  const primaryImageUrl = `https://image.pollinations.ai/prompt/${encodedDest}?width=800&height=600&nologo=true`;
  const fallbackImageUrl = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800";

  const [imgSrc, setImgSrc] = useState(primaryImageUrl);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(fallbackImageUrl);
      setHasError(true);
    }
  };

  // Extract unique accommodation types safely
  const accommodationTypes: string[] = trip.accommodationInfo && trip.accommodationInfo.length > 0 
    ? Array.from(new Set(trip.accommodationInfo.map((acc) => acc?.type || 'Hotel')))
    : ['Hotel'];

  const getIconForType = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('resort')) return <Palmtree className="w-4 h-4 text-cyan-400" />;
    if (t.includes('camp') || t.includes('glamp')) return <Tent className="w-4 h-4 text-emerald-400" />;
    if (t.includes('villa') || t.includes('home')) return <Home className="w-4 h-4 text-teal-400" />;
    if (t.includes('airbnb') || t.includes('apartment')) return <Building className="w-4 h-4 text-indigo-400" />;
    if (t.includes('hostel')) return <BedDouble className="w-4 h-4 text-orange-400" />;
    return <Hotel className="w-4 h-4 text-blue-400" />;
  };

  // Safely handle transportation display (array or fallback)
  const transportPreview = Array.isArray(trip.transportation) 
    ? trip.transportation.slice(0, 2).map(t => t?.type || '').filter(Boolean).join(", ")
    : "Various Options";

  return (
    <div 
      onClick={() => onClick(trip)}
      className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] overflow-hidden cursor-pointer flex flex-col h-full transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(20,184,166,0.4)] hover:border-teal-500/50"
    >
      {/* Image Section */}
      <div className="h-56 md:h-64 overflow-hidden relative bg-slate-800">
        <img 
          src={imgSrc} 
          alt={trip.destination || 'Trip Destination'} 
          onError={handleError}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-90" />
        
        <div className="absolute bottom-5 left-5 text-white z-10 pr-4">
          <h3 className="text-2xl md:text-3xl font-bold leading-tight mb-1 break-words">{trip.destination}</h3>
          <p className="text-white/80 font-medium flex items-center gap-1.5 text-sm">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0" /> {trip.country}
          </p>
        </div>

        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
           {trip.totalEstimatedCost} <span className="text-xs font-normal opacity-70">{trip.currency}</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 md:p-6 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 text-xs rounded-lg border border-blue-500/20 flex items-center gap-1">
             <Clock className="w-3 h-3" /> {trip.duration} Days
          </span>
          {trip.tags?.slice(0, 2).map((tag, i) => (
            <span key={i} className="px-2.5 py-1 bg-white/5 text-xs rounded-lg border border-white/10 text-white/60">
              #{tag}
            </span>
          ))}
        </div>

        <p className="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
          {trip.description}
        </p>

        <div className="mt-auto space-y-4">
          {/* Logistics Snippets */}
          <div className="grid grid-cols-1 gap-3 text-xs text-gray-400 border-t border-white/5 pt-4">
            {trip.flightInfo && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="bg-white/5 p-1.5 rounded-lg shrink-0">
                      <Plane className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <span className="truncate">{trip.flightInfo.airline}</span>
                </div>
                <span className="font-semibold text-sky-400 shrink-0 pl-2">{trip.flightInfo.totalPrice}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2 overflow-hidden">
                  <div className="bg-white/5 p-1.5 rounded-lg shrink-0">
                    <Car className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <span className="truncate">Local Transit</span>
               </div>
               <span className="font-medium text-gray-500 shrink-0 pl-2">{transportPreview}</span>
            </div>

             {/* Accommodation Icons List */}
             <div className="bg-white/5 p-2.5 rounded-xl flex items-center justify-between gap-2">
               <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 shrink-0">Stays</span>
               <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {accommodationTypes.slice(0, 5).map((type, i) => (
                    <div key={i} className="flex items-center justify-center w-6 h-6 bg-white/5 rounded-full shrink-0 border border-white/5" title={type}>
                      {getIconForType(type)}
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="pt-2">
             <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-teal-600 hover:text-white text-gray-300 text-sm font-semibold transition-all flex items-center justify-center gap-2 group/btn">
               View Trip Details
               <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};