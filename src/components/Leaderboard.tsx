/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { LeaderboardEntry } from '../types';
import { ShimmerTableRow } from './Shimmer';

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  isLoadingPlayers: boolean;
  isLoadingMatches: boolean;
  onPlayerClick: (playerId: number) => void;
  onExportCSV: () => void;
}

export function Leaderboard({
  leaderboard,
  isLoadingPlayers,
  isLoadingMatches,
  onPlayerClick,
  onExportCSV
}: LeaderboardProps) {
  return (
    <section className="glass-panel p-8 h-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold font-display flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-secondary" />
          Season Standings
        </h2>
        <button 
          onClick={onExportCSV}
          className="btn-secondary flex items-center gap-2 py-2 px-4 text-xs"
        >
          <Download className="w-4 h-4" />
          EXPORT DATA (CSV)
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] border-b border-outline-variant">
              <th className="pb-4 font-black">Player</th>
              <th className="pb-4 font-black text-center">Invested</th>
              <th className="pb-4 font-black text-center">Won</th>
              <th className="pb-4 font-black text-center">Streak</th>
              <th className="pb-4 font-black text-center">Badges</th>
              <th className="pb-4 font-black text-right">Net P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoadingPlayers || isLoadingMatches ? (
              // Show shimmer rows while loading
              Array.from({ length: 5 }).map((_, i) => (
                <ShimmerTableRow key={i} />
              ))
            ) : (
              leaderboard.map((entry, index) => (
                <motion.tr
                  key={entry.playerId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group hover:bg-on-surface/[0.02] transition-colors cursor-pointer"
                  onClick={() => onPlayerClick(entry.playerId)}
                  title="Click to view player profile"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-on-surface-variant w-4">{index + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center">
                        <Users className="w-4 h-4 text-on-surface-variant" />
                      </div>
                      <span className="font-bold">{entry.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-center font-bold text-on-surface-variant">₹{entry.invested}</td>
                  <td className="py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold">{entry.won}</span>
                      {entry.won > 0 && <TrendingUp className="w-3 h-3 text-primary" />}
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    {entry.winStreak > 0 && (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg">🔥</span>
                        <span className="font-bold text-orange-500">{entry.winStreak}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {entry.badges.map((badge, badgeIndex) => (
                        <span
                          key={badgeIndex}
                          className="px-2 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full"
                          title={badge}
                        >
                          {badge === 'Most Wins' && '🏆'}
                          {badge === 'On a Roll' && '🔥'}
                          {badge === 'Comeback King' && '👑'}
                          {badge === 'Champion' && '🥇'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <span className={`font-black ${entry.profit >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                      {entry.profit >= 0 ? '+' : ''}₹{entry.profit}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
