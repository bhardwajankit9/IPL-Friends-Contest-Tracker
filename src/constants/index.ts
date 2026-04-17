/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, MatchType } from '../types';

export const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Ankit' },
  { id: 2, name: 'Sumit Baghel' },
  { id: 3, name: 'Nachiket' },
  { id: 4, name: 'Guru' },
  { id: 5, name: 'Pramod Patil' },
];

export const SEASONS = ['IPL 2024', 'IPL 2025', 'IPL 2026'];
export const CURRENT_SEASON = 'IPL 2026';

export const IPL_TEAMS = [
  'CSK', 'MI', 'RCB', 'KKR', 'SRH', 'DC', 'PBKS', 'RR', 'LSG', 'GT'
];

export const MATCH_TYPES: { type: MatchType; fee: number }[] = [
  { type: 'Normal', fee: 40 },
  { type: 'Qualifier', fee: 100 },
  { type: 'Final', fee: 100 },
  { type: 'Custom', fee: 20 },
  { type: 'Tie', fee: 0 },
];
