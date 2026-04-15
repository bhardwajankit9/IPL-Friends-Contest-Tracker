/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, Download, Users, Trophy as TrophyIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface StatsBarProps {
  totalMatches: number;
  totalPoolMoney: number;
  biggestWinner: { name: string; profit: number; playerId: number } | null;
  winRateChampion: { name: string; winRate: number; id: number; matchesPlayed: number } | null;
  onPlayerClick: (playerId: number) => void;
}

export function StatsBar({ 
  totalMatches, 
  totalPoolMoney, 
  biggestWinner, 
  winRateChampion,
  onPlayerClick 
}: StatsBarProps) {
  return (
    <div className="mb-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 text-center"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div className="text-3xl font-black text-primary mb-1">{totalMatches}</div>
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Matches</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 text-center"
        >
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Download className="w-6 h-6 text-secondary" />
          </div>
          <div className="text-3xl font-black text-secondary mb-1">₹{totalPoolMoney}</div>
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Pool</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 text-center cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => biggestWinner && onPlayerClick(biggestWinner.playerId)}
          title="Click to view player profile"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrophyIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="text-xl font-black mb-1">
            {biggestWinner ? biggestWinner.name : 'N/A'}
          </div>
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Biggest Winner</div>
          {biggestWinner && (
            <div className={`text-lg font-black ${biggestWinner.profit >= 0 ? 'text-green-500' : 'text-rose-500'}`}>
              ₹{biggestWinner.profit}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 text-center cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => winRateChampion && onPlayerClick(winRateChampion.id)}
          title="Click to view player profile"
        >
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrophyIcon className="w-6 h-6 text-secondary" />
          </div>
          <div className="text-xl font-black mb-1">
            {winRateChampion ? winRateChampion.name : 'N/A'}
          </div>
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Win Rate Champion</div>
          {winRateChampion && (
            <div className="text-lg font-black text-secondary">
              {winRateChampion.winRate.toFixed(0)}% ({winRateChampion.matchesPlayed} games)
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
