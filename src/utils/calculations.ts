/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, Player, LeaderboardEntry } from '../types';

export function calculateLeaderboard(
  players: Player[],
  matches: Match[]
): LeaderboardEntry[] {
  const board: Record<number, LeaderboardEntry> = {};
  
  players.forEach(p => {
    board[p.id] = {
      playerId: p.id,
      name: p.name,
      invested: 0,
      won: 0,
      profit: 0,
      winStreak: 0,
      badges: []
    };
  });

  matches.forEach(m => {
    m.predictions.forEach(pred => {
      if (board[pred.playerId]) {
        board[pred.playerId].invested += m.entryFee;
      }
    });

    if (m.winnerId && board[m.winnerId]) {
      board[m.winnerId].won += m.prizeWinner;
    }
    if (m.runnerUpId && board[m.runnerUpId]) {
      board[m.runnerUpId].won += m.prizeRunnerUp;
    }
  });

  const sortedMatches = [...matches].sort((a, b) => b.timestamp - a.timestamp);
  
  Object.values(board).forEach(entry => {
    entry.profit = entry.won - entry.invested;
    
    // Calculate win streak
    let streak = 0;
    for (const match of sortedMatches) {
      if (match.winnerId === entry.playerId) {
        streak++;
      } else if (match.predictions.some(p => p.playerId === entry.playerId)) {
        break;
      }
    }
    entry.winStreak = streak;
    
    // Calculate badges
    const totalWins = matches.filter(m => m.winnerId === entry.playerId).length;
    const totalMatches = matches.filter(m => m.predictions.some(p => p.playerId === entry.playerId)).length;
    const winRate = totalMatches > 0 ? totalWins / totalMatches : 0;
    
    if (totalWins === Math.max(...Object.values(board).map(e => 
      matches.filter(m => m.winnerId === e.playerId).length
    ))) {
      entry.badges.push('Most Wins');
    }
    
    if (entry.winStreak >= 3) {
      entry.badges.push('On a Roll');
    }
    
    if (winRate >= 0.6 && totalMatches >= 5) {
      entry.badges.push('Comeback King');
    }
    
    if (entry.profit === Math.max(...Object.values(board).map(e => e.profit))) {
      entry.badges.push('Champion');
    }
  });

  return Object.values(board).sort((a, b) => b.profit - a.profit);
}

export function calculateSeasonStats(
  matches: Match[],
  leaderboard: LeaderboardEntry[],
  players: Player[]
) {
  const totalMatches = matches.length;
  const totalPoolMoney = matches.reduce((sum, match) => sum + match.totalPool, 0);
  const biggestWinner = leaderboard.length > 0 ? leaderboard[0] : null;

  const playerParticipation = players.map(player => {
    const playerMatches = matches.filter(match =>
      match.predictions.some(pred => pred.playerId === player.id)
    );
    return {
      ...player,
      matchCount: playerMatches.length
    };
  });

  const mostActivePlayer = playerParticipation.length > 0
    ? playerParticipation.reduce((max, player) =>
        player.matchCount > max.matchCount ? player : max
      )
    : null;

  return {
    totalMatches,
    totalPoolMoney,
    biggestWinner,
    mostActivePlayer
  };
}
