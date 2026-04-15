/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, Users, PlusCircle, Edit2, RotateCcw } from 'lucide-react';
import { Player, MatchType } from '../types';
import { MATCH_TYPES, IPL_TEAMS } from '../constants';
import { ShimmerCard } from './Shimmer';

interface MatchFormProps {
  // Team selection
  teamA: string;
  teamB: string;
  setTeamA: (team: string) => void;
  setTeamB: (team: string) => void;

  // Fee configuration
  feeMode: 'preset' | 'custom';
  setFeeMode: (mode: 'preset' | 'custom') => void;
  matchType: MatchType;
  setMatchType: (type: MatchType) => void;
  customEntryFee: number;
  setCustomEntryFee: (fee: number) => void;
  currentEntryFee: number;
  currentWinnerPrize: number;
  currentRunnerUpPrize: number;

  // Player selection
  players: Player[];
  selectedPlayerIds: number[];
  togglePlayerSelection: (id: number) => void;
  isLoadingPlayers: boolean;

  // Results
  winnerPlayerId: number | null;
  setWinnerPlayerId: (id: number | null) => void;
  runnerUpPlayerId: number | null;
  setRunnerUpPlayerId: (id: number | null) => void;
  derivedWinner: Player | null;
  derivedRunnerUp: Player | null;

  // Actions
  editingMatchId: string | null;
  onSubmit: () => void;
  onReset: () => void;
  onManagePlayers: () => void;
}

export function MatchForm(props: MatchFormProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
      {/* Left Column: Match Details & Rewards */}
      <div className="lg:col-span-4 space-y-8">
        <section className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-display">Match Details</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Select Teams</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={props.teamA}
                  onChange={(e) => props.setTeamA(e.target.value)}
                  className="input-field appearance-none"
                >
                  <option value="">Team A</option>
                  {IPL_TEAMS.map(team => (
                    <option key={team} value={team} disabled={team === props.teamB}>{team}</option>
                  ))}
                </select>
                <div className="flex items-center justify-center text-on-surface-variant font-bold">vs</div>
                <select
                  value={props.teamB}
                  onChange={(e) => props.setTeamB(e.target.value)}
                  className="input-field appearance-none"
                >
                  <option value="">Team B</option>
                  {IPL_TEAMS.map(team => (
                    <option key={team} value={team} disabled={team === props.teamA}>{team}</option>
                  ))}
                </select>
              </div>
              {props.teamA && props.teamB && (
                <div className="text-center text-sm font-bold text-primary mt-2">
                  {props.teamA} vs {props.teamB}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Entry Fee</label>

              {/* Fee Mode Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => props.setFeeMode('preset')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                    props.feeMode === 'preset'
                      ? 'bg-primary text-background'
                      : 'bg-surface-bright text-on-surface-variant hover:bg-surface-bright/80'
                  }`}
                >
                  Preset Fees
                </button>
                <button
                  onClick={() => props.setFeeMode('custom')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                    props.feeMode === 'custom'
                      ? 'bg-primary text-background'
                      : 'bg-surface-bright text-on-surface-variant hover:bg-surface-bright/80'
                  }`}
                >
                  Custom Fee
                </button>
              </div>

              {props.feeMode === 'preset' ? (
                <select
                  value={props.matchType}
                  onChange={(e) => props.setMatchType(e.target.value as MatchType)}
                  className="input-field w-full appearance-none"
                >
                  {MATCH_TYPES.map(t => (
                    <option key={t.type} value={t.type}>{t.type} League (₹{t.fee} Entry)</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min="1"
                  placeholder="20"
                  value={props.customEntryFee}
                  onChange={(e) => props.setCustomEntryFee(Number(e.target.value) || 0)}
                  className="input-field w-full"
                />
              )}
            </div>

            <div className="pt-6 flex justify-between items-center border-t border-outline-variant">
              <span className="text-sm font-bold text-on-surface-variant">Pool Status</span>
              <span className="text-2xl font-black text-primary">₹{props.currentEntryFee * props.selectedPlayerIds.length}</span>
            </div>
          </div>
        </section>

        <section className="glass-panel p-8">
          <h2 className="text-xl font-bold font-display mb-8">Current Rewards</h2>
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">1st Prize Winner</p>
                <p className="font-bold text-lg">{props.derivedWinner ? props.derivedWinner.name : 'Pending...'}</p>
              </div>
              <span className="text-xl font-black text-primary">₹{props.currentWinnerPrize}</span>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-r from-secondary/10 to-transparent border border-secondary/20 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">2nd Prize Runner-up</p>
                <p className="font-bold text-lg">{props.derivedRunnerUp ? props.derivedRunnerUp.name : 'Pending...'}</p>
              </div>
              <span className="text-xl font-black text-secondary">₹{props.currentRunnerUpPrize}</span>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <button 
            onClick={props.onSubmit}
            className="btn-primary w-full flex items-center justify-center gap-3 py-4"
          >
            <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center">
              {props.editingMatchId ? <Edit2 className="w-3 h-3 text-primary" /> : <RotateCcw className="w-3 h-3 text-primary" />}
            </div>
            {props.editingMatchId ? 'UPDATE MATCH' : 'SAVE & FINALIZE MATCH'}
          </button>
          <button 
            onClick={props.onReset}
            className="btn-secondary w-full py-4 uppercase tracking-widest text-xs"
          >
            {props.editingMatchId ? 'Cancel Edit' : 'Reset Current'}
          </button>
        </div>
      </div>

      {/* Center Column: Player Predictions */}
      <div className="lg:col-span-8 space-y-8">
        <section className="glass-panel p-8 relative overflow-hidden">
          <div className="absolute top-4 right-8 text-6xl font-black text-on-surface/5 pointer-events-none font-display">
            {props.players.length.toString().padStart(2, '0')}
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-display mb-1">Match Participants</h2>
            <p className="text-on-surface-variant text-sm">Select the friends playing in this match.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {props.isLoadingPlayers ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <ShimmerCard />
                </div>
              ))
            ) : (
              props.players.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => props.togglePlayerSelection(p.id)}
                  className={`glass-card p-5 transition-all cursor-pointer group ${
                    props.selectedPlayerIds.includes(p.id) ? 'border-primary/40 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        props.selectedPlayerIds.includes(p.id) ? 'bg-primary text-background' : 'bg-surface-bright text-on-surface-variant'
                      }`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
                          {props.selectedPlayerIds.includes(p.id) ? 'Participating' : 'Sitting Out'}
                        </p>
                      </div>
                    </div>
                    {props.selectedPlayerIds.includes(p.id) && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <RotateCcw className="w-3 h-3 text-background" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            <button 
              onClick={props.onManagePlayers}
              className="glass-card p-5 border-dashed border-outline-variant flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant transition-all"
            >
              <PlusCircle className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-widest">Manage Players</span>
            </button>
          </div>

          <div className="glass-card p-8 bg-surface-high/60">
            <div className="mb-6">
              <h3 className="text-xl font-bold font-display mb-1">Match Results</h3>
              <p className="text-on-surface-variant text-sm">Select the 1st and 2nd place winners from the participants.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest">🥇 1st Prize Winner</label>
                <select 
                  value={props.winnerPlayerId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    props.setWinnerPlayerId(val);
                    if (val && val === props.runnerUpPlayerId) props.setRunnerUpPlayerId(null);
                  }}
                  className="w-full input-field appearance-none"
                >
                  <option value="">-- No Winner --</option>
                  {props.players.filter(p => props.selectedPlayerIds.includes(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">🥈 2nd Prize Runner-up</label>
                <select 
                  value={props.runnerUpPlayerId || ''}
                  onChange={(e) => props.setRunnerUpPlayerId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full input-field appearance-none"
                >
                  <option value="">-- No Runner-up --</option>
                  {props.players.filter(p => props.selectedPlayerIds.includes(p.id) && p.id !== props.winnerPlayerId).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
