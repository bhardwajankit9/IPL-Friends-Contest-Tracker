/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, Player } from '../types';

export function shareMatchToWhatsApp(match: Match, players: Player[]) {
  const winner = players.find(p => p.id === match.winnerId);
  const runnerUp = players.find(p => p.id === match.runnerUpId);
  
  const predictions = match.predictions.map(pred => {
    const player = players.find(p => p.id === pred.playerId);
    return `${player?.name || 'Unknown'}: ${pred.predictedWinner}`;
  }).join('\n');

  const message = `🏆 IPL Contest Result 🏆

Match: ${match.name}
Date: ${new Date(match.timestamp).toLocaleDateString('en-IN', { 
  day: 'numeric', 
  month: 'short', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Entry Fee: ₹${match.entryFee}
Total Pool: ₹${match.totalPool}

${match.winnerId ? `🏅 Winner: ${winner?.name || 'Unknown'} (₹${match.prizeWinner})` : '❌ No winner declared'}
${match.runnerUpId ? `🥈 Runner-up: ${runnerUp?.name || 'Unknown'} (₹${match.prizeRunnerUp})` : ''}

Predictions:
${predictions}

📊 Check out more results at Arena Prime!`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}
