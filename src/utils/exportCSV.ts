/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeaderboardEntry } from '../types';

export function exportLeaderboardToCSV(leaderboard: LeaderboardEntry[]) {
  const headers = ['Player Name', 'Total Invested', 'Total Won', 'Win Streak', 'Badges', 'Net Profit/Loss'];
  const rows = leaderboard.map(e => [
    e.name,
    e.invested,
    e.won,
    e.winStreak,
    e.badges.join('; '),
    e.profit
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `ipl_leaderboard_${new Date().toLocaleDateString()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
