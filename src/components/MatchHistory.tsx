/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { RefObject } from 'react';
import { Edit2, Trash2, Share, X, RotateCcw } from 'lucide-react';
import { Match, Player } from '../types';
import { LoadingSpinner, ShimmerMatchHistory } from './Shimmer';

interface MatchHistoryProps {
  matches: Match[];
  players: Player[];
  isLoadingMatches: boolean;
  deletingMatchId: string | null;
  matchHistoryRef: RefObject<HTMLDivElement>;
  onEditMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
  onShareMatch: (match: Match) => void;
}

export function MatchHistory({
  matches,
  players,
  isLoadingMatches,
  deletingMatchId,
  matchHistoryRef,
  onEditMatch,
  onDeleteMatch,
  onShareMatch
}: MatchHistoryProps) {
  return (
    <section className="glass-panel p-8 h-full">
      <h2 className="text-2xl font-bold font-display mb-8">Match History</h2>
      <div className="space-y-4">
        <div className="flex justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-2">
          <span>Date</span>
          <span>Match</span>
          <span>Outcome</span>
        </div>
        <div ref={matchHistoryRef} className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {isLoadingMatches ? (
            <ShimmerMatchHistory />
          ) : (
            <>
              {matches.map(match => (
                <div key={match.id} className="flex flex-col py-3 group border-b border-outline-variant/30 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-on-surface-variant">
                      {new Date(match.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}
                    </span>
                    <span className="text-sm font-bold">{match.name}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${match.winnerId ? 'bg-primary/20 text-primary' : 'bg-rose-500/20 text-rose-500'}`}>
                      {match.winnerId ? <RotateCcw className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onShareMatch(match)}
                      className="p-2 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 transition-colors"
                      title="Share on WhatsApp"
                    >
                      <Share className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onEditMatch(match)}
                      className="p-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary/80 transition-colors"
                      title="Edit Match"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteMatch(match.id)}
                      disabled={deletingMatchId === match.id}
                      className="p-1.5 rounded-md bg-surface-bright text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Match"
                    >
                      {deletingMatchId === match.id ? (
                        <LoadingSpinner size="w-3.5 h-3.5" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {matches.length === 0 && !isLoadingMatches && (
                <div className="text-center py-12 text-on-surface-variant text-sm italic">
                  No matches yet
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
