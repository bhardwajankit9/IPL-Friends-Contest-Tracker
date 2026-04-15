/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LoadingSpinner } from './Shimmer';

interface SeasonSwitcherProps {
  seasons: string[];
  currentSeason: string;
  isLoadingPlayers: boolean;
  isLoadingMatches: boolean;
  onSeasonChange: (season: string) => void;
}

export function SeasonSwitcher({
  seasons,
  currentSeason,
  isLoadingPlayers,
  isLoadingMatches,
  onSeasonChange
}: SeasonSwitcherProps) {
  return (
    <div className="mb-10 flex items-center gap-4 flex-wrap">
      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Season</span>
      <div className="flex gap-2 flex-wrap">
        {seasons.map(season => (
          <button
            key={season}
            onClick={() => onSeasonChange(season)}
            disabled={isLoadingPlayers || isLoadingMatches}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
              currentSeason === season
                ? 'bg-primary text-background border-primary shadow-lg shadow-primary/20'
                : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              {season}
              {(isLoadingPlayers || isLoadingMatches) && currentSeason === season && (
                <LoadingSpinner size="w-3 h-3" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
