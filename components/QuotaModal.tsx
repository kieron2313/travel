import React from 'react';
import { QuotaInfo } from '../types';
import { 
  X, 
  RefreshCw, 
  Activity, 
  Sparkles, 
  Search, 
  Clock, 
  Calendar, 
  Mail, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle,
  Layers
} from 'lucide-react';

interface QuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: QuotaInfo | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const QuotaModal: React.FC<QuotaModalProps> = ({
  isOpen,
  onClose,
  quota,
  isLoading,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const serpApi = quota?.serpApi;
  const gemini = quota?.gemini;

  const serpTotal = serpApi?.totalSearches ?? 250;
  const serpLeft = serpApi?.searchesLeft ?? 250;
  const serpUsed = serpApi?.searchesUsedThisMonth ?? Math.max(0, serpTotal - serpLeft);
  const serpPercent = Math.max(0, Math.min(100, Math.round((serpLeft / (serpTotal || 1)) * 100)));

  const geminiLimit = gemini?.dailyLimit ?? 1500;
  const geminiLeft = gemini?.requestsLeftToday ?? 1500;
  const geminiUsed = gemini?.requestsUsedToday ?? 0;
  const geminiPercent = Math.max(0, Math.min(100, Math.round((geminiLeft / (geminiLimit || 1)) * 100)));

  const formatNumber = (num: number = 0) => new Intl.NumberFormat().format(num);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/75 animate-fadeIn">
      {/* Background dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden z-10 my-8">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-start justify-between pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="bg-gradient-to-tr from-teal-500 to-cyan-500 p-2 rounded-xl text-white shadow-md">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">API Quota & Usage</h2>
            </div>
            <p className="text-sm text-gray-400">
              Live quota monitoring for SerpApi hotel inventory and Gemini AI travel planner
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-all border border-white/10 disabled:opacity-50"
              title="Refresh quota status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Banner */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* SerpApi Highlight Card */}
          <div className="relative p-5 sm:p-6 bg-gradient-to-br from-teal-950/40 via-slate-900/60 to-slate-800/40 border border-teal-500/30 rounded-2xl overflow-hidden shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">SerpApi Searches</h3>
                  <span className="text-xs text-gray-400">Live Hotel & Image Quota</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{serpLeft}</span>
              <span className="text-sm font-medium text-gray-400">of {serpTotal} total searches</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5 mb-3">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  serpPercent > 30 ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-red-500'
                }`}
                style={{ width: `${serpPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-medium text-teal-400">{serpPercent}% quota remaining</span>
              <span>{serpUsed} used this month</span>
            </div>
          </div>

          {/* Gemini AI Highlight Card */}
          <div className="relative p-5 sm:p-6 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-800/40 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Gemini AI Engine</h3>
                  <span className="text-xs text-gray-400">Trip Planner & Geocoding</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Ready
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{formatNumber(geminiLeft)}</span>
              <span className="text-sm font-medium text-gray-400">of {formatNumber(geminiLimit)} daily calls</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5 mb-3">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                style={{ width: `${geminiPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-medium text-cyan-400">{geminiPercent}% daily quota left</span>
              <span>{geminiUsed} requests today</span>
            </div>
          </div>

        </div>

        {/* Detailed Metrics Tabs / Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SerpApi Details */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" /> SerpApi Account Breakdown
            </h4>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" /> Account Email
                </span>
                <span className="font-semibold text-gray-200">{serpApi?.accountEmail || 'wdsolutionnet@gmail.com'}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-500" /> Plan Tier
                </span>
                <span className="font-semibold text-teal-300">{serpApi?.planName || 'Free Plan'} (250 Searches/mo)</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" /> Next Renewal Date
                </span>
                <span className="font-semibold text-gray-200">{serpApi?.renewalDate || '2026-11-23'}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" /> Hourly Rate Limit
                </span>
                <span className="font-semibold text-gray-200">{serpApi?.hourlyLimit || 250} / hour</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-gray-400">Total Available Left</span>
                <span className="text-base font-extrabold text-teal-400">{serpLeft} searches</span>
              </div>
            </div>
          </div>

          {/* Gemini AI Details */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Gemini AI Model & Consumption
            </h4>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400">Primary Model</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {gemini?.model || 'gemini-3.8-flash'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400">Rate Limit (RPM)</span>
                <span className="font-semibold text-gray-200">15 Requests / minute</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400">Daily Requests Limit (RPD)</span>
                <span className="font-semibold text-gray-200">1,500 Requests / day</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400">Total Tokens Processed</span>
                <span className="font-mono font-semibold text-cyan-400">
                  {formatNumber(gemini?.totalTokensUsed || 0)} tokens
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-gray-400">Daily Quota Left</span>
                <span className="text-base font-extrabold text-cyan-400">
                  {formatNumber(geminiLeft)} requests
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* How Quota is Used Callout */}
        <div className="mt-6 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white block">How is quota consumed?</span>
              <span>Each trip search generates 4 custom travel itineraries with flight estimates, plus optional Google Hotel searches for live rates.</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold transition-all shrink-0 text-center"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};
