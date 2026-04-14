/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  History, 
  PlusCircle, 
  Download, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- Types ---

type MatchType = 'Normal' | 'Qualifier' | 'Final';

interface Player {
  id: number;
  name: string;
}

interface Prediction {
  playerId: number;
  predictedWinner: string;
}

interface Match {
  id: string;
  name: string;
  type: MatchType;
  entryFee: number;
  totalPool: number;
  predictions: Prediction[];
  actualWinner: string;
  winnerId: number | null;
  runnerUpId: number | null;
  prizeWinner: number;
  prizeRunnerUp: number;
  timestamp: number;
}

interface LeaderboardEntry {
  playerId: number;
  name: string;
  invested: number;
  won: number;
  profit: number;
}

// --- Constants ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const MATCH_TYPES: { type: MatchType; fee: number; winnerPrize: number; runnerUpPrize: number }[] = [
  { type: 'Normal', fee: 20, winnerPrize: 40, runnerUpPrize: 20 },
  { type: 'Qualifier', fee: 50, winnerPrize: 100, runnerUpPrize: 50 },
  { type: 'Final', fee: 100, winnerPrize: 200, runnerUpPrize: 100 },
];

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Ankit' },
  { id: 2, name: 'Sumit Baghel' },
  { id: 3, name: 'Nachiket' },
  { id: 4, name: 'Guru' },
  { id: 5, name: 'Pramod Patil' },
];

// --- Components ---

export default function App() {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isEditingPlayers, setIsEditingPlayers] = useState(false);
  
  // Current Match Entry State
  const [matchName, setMatchName] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('Normal');
  const [winnerPlayerId, setWinnerPlayerId] = useState<number | null>(null);
  const [runnerUpPlayerId, setRunnerUpPlayerId] = useState<number | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [isAddingNewPlayerInModal, setIsAddingNewPlayerInModal] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  
  // Custom Alert/Confirm State
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string; title?: string; onConfirm?: () => void; isConfirm?: boolean }>({
    show: false,
    message: '',
    isConfirm: false
  });

  const showAlert = (message: string, title = "Alert") => {
    setAlertConfig({ show: true, message, title, isConfirm: false });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = "Confirm") => {
    setAlertConfig({ show: true, message, title, onConfirm, isConfirm: true });
  };

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setPlayers([]);
      setMatches([]);
      return;
    }
    
    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const loadedPlayers: Player[] = [];
      snapshot.forEach((doc) => loadedPlayers.push(doc.data() as Player));
      if (loadedPlayers.length > 0) {
        setPlayers(loadedPlayers);
      } else {
        // Initialize default players
        DEFAULT_PLAYERS.forEach(p => {
          setDoc(doc(db, 'players', p.id.toString()), p).catch(error => handleFirestoreError(error, OperationType.WRITE, 'players'));
        });
      }
    }, (error) => {
      console.error("Error loading players:", error);
      handleFirestoreError(error, OperationType.LIST, 'players');
    });

    const q = query(collection(db, 'matches'), orderBy('timestamp', 'desc'));
    const unsubscribeMatches = onSnapshot(q, (snapshot) => {
      const loadedMatches: Match[] = [];
      snapshot.forEach((doc) => loadedMatches.push(doc.data() as Match));
      setMatches(loadedMatches);
    }, (error) => {
      console.error("Error loading matches:", error);
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    return () => {
      unsubscribePlayers();
      unsubscribeMatches();
    };
  }, [isAuthReady, user]);

  // --- Calculations ---
  const currentTypeConfig = useMemo(() => 
    MATCH_TYPES.find(t => t.type === matchType)!, 
  [matchType]);

  // Derived winners for real-time UI feedback
  const derivedWinner = useMemo(() => players.find(p => p.id === winnerPlayerId) || null, [players, winnerPlayerId]);
  const derivedRunnerUp = useMemo(() => players.find(p => p.id === runnerUpPlayerId) || null, [players, runnerUpPlayerId]);

  const leaderboard = useMemo(() => {
    const board: Record<number, LeaderboardEntry> = {};
    players.forEach(p => {
      board[p.id] = {
        playerId: p.id,
        name: p.name,
        invested: 0,
        won: 0,
        profit: 0
      };
    });

    matches.forEach(m => {
      // Calculate investment only for participating players
      m.predictions.forEach(pred => {
        if (board[pred.playerId]) {
          board[pred.playerId].invested += m.entryFee;
        }
      });

      // Add winnings if the winner/runner-up is still in the current player list
      if (m.winnerId && board[m.winnerId]) {
        board[m.winnerId].won += m.prizeWinner;
      }
      if (m.runnerUpId && board[m.runnerUpId]) {
        board[m.runnerUpId].won += m.prizeRunnerUp;
      }
    });

    Object.values(board).forEach(entry => {
      entry.profit = entry.won - entry.invested;
    });

    return Object.values(board).sort((a, b) => b.profit - a.profit);
  }, [players, matches]);

  // --- Handlers ---
  const handleAddMatch = async () => {
    if (!matchName) {
      showAlert('Please enter match name.');
      return;
    }

    if (selectedPlayerIds.length < 2) {
      showAlert('Please select at least two players.');
      return;
    }

    if (winnerPlayerId && runnerUpPlayerId && winnerPlayerId === runnerUpPlayerId) {
      showAlert('Winner and Runner-up cannot be the same person.');
      return;
    }

    const participatingPlayers = players.filter(p => selectedPlayerIds.includes(p.id));

    const newMatch: Match = {
      id: editingMatchId || Date.now().toString(),
      name: matchName,
      type: matchType,
      entryFee: currentTypeConfig.fee,
      totalPool: currentTypeConfig.fee * selectedPlayerIds.length,
      predictions: participatingPlayers.map(p => ({ playerId: p.id, predictedWinner: '' })),
      actualWinner: '',
      winnerId: winnerPlayerId,
      runnerUpId: runnerUpPlayerId,
      prizeWinner: winnerPlayerId ? currentTypeConfig.winnerPrize : 0,
      prizeRunnerUp: runnerUpPlayerId ? currentTypeConfig.runnerUpPrize : 0,
      timestamp: editingMatchId ? (matches.find(m => m.id === editingMatchId)?.timestamp || Date.now()) : Date.now()
    };

    try {
      await setDoc(doc(db, 'matches', newMatch.id), newMatch);
      resetForm();
      setIsAddingMatch(false);
    } catch (error) {
      showAlert('Failed to save match. Please check permissions.');
      handleFirestoreError(error, OperationType.WRITE, 'matches');
    }
  };

  const resetForm = () => {
    setMatchName('');
    setMatchType('Normal');
    setWinnerPlayerId(null);
    setRunnerUpPlayerId(null);
    setSelectedPlayerIds([]);
    setIsAddingNewPlayerInModal(false);
    setEditingMatchId(null);
  };

  const handleEditMatch = (match: Match) => {
    setMatchName(match.name);
    setMatchType(match.type);
    setSelectedPlayerIds(match.predictions.map(p => p.playerId));
    setWinnerPlayerId(match.winnerId);
    setRunnerUpPlayerId(match.runnerUpId);
    setEditingMatchId(match.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMatch = (matchId: string) => {
    showConfirm('Are you sure you want to delete this match?', async () => {
      try {
        await deleteDoc(doc(db, 'matches', matchId));
        if (editingMatchId === matchId) {
          resetForm();
        }
      } catch (error) {
        showAlert('Failed to delete match.');
        handleFirestoreError(error, OperationType.DELETE, 'matches');
      }
    });
  };

  const handleResetAll = () => {
    showConfirm('Are you sure you want to reset all data? This cannot be undone.', async () => {
      try {
        for (const match of matches) {
          await deleteDoc(doc(db, 'matches', match.id));
        }
        for (const player of players) {
          await deleteDoc(doc(db, 'players', player.id.toString()));
        }
        DEFAULT_PLAYERS.forEach(p => {
          setDoc(doc(db, 'players', p.id.toString()), p).catch(error => handleFirestoreError(error, OperationType.WRITE, 'players'));
        });
      } catch (error) {
        showAlert('Failed to reset data.');
        handleFirestoreError(error, OperationType.DELETE, 'matches/players');
      }
    }, 'Reset All Data');
  };

  const exportCSV = () => {
    const headers = ['Player Name', 'Total Invested', 'Total Won', 'Net Profit/Loss'];
    const rows = leaderboard.map(e => [e.name, e.invested, e.won, e.profit]);
    
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
  };

  const updatePlayerName = async (id: number, newName: string) => {
    const player = players.find(p => p.id === id);
    if (player) {
      try {
        await setDoc(doc(db, 'players', id.toString()), { ...player, name: newName });
      } catch (error) {
        showAlert('Failed to update player.');
        handleFirestoreError(error, OperationType.WRITE, 'players');
      }
    }
  };

  const addNewPlayer = async (fromModal = false) => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Date.now(),
      name: newPlayerName.trim()
    };
    try {
      await setDoc(doc(db, 'players', newPlayer.id.toString()), newPlayer);
      setNewPlayerName('');
      if (fromModal) {
        setSelectedPlayerIds([...selectedPlayerIds, newPlayer.id]);
        setIsAddingNewPlayerInModal(false);
      }
    } catch (error) {
      showAlert('Failed to add player.');
      handleFirestoreError(error, OperationType.WRITE, 'players');
    }
  };

  const togglePlayerSelection = (id: number) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const removePlayer = (id: number) => {
    if (players.length <= 1) {
      showAlert("At least one player is required.");
      return;
    }
    showConfirm(`Are you sure you want to delete this player? Their name will be removed from the leaderboard, but match history will be preserved.`, async () => {
      try {
        await deleteDoc(doc(db, 'players', id.toString()));
      } catch (error) {
        showAlert('Failed to delete player.');
        handleFirestoreError(error, OperationType.DELETE, 'players');
      }
    });
  };

  const resetPlayersToDefault = () => {
    showConfirm('Reset player list to defaults? This will not affect match history but may change how future matches are calculated.', () => {
      setPlayers(DEFAULT_PLAYERS);
    });
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-background text-on-surface font-sans p-4 md:p-8 selection:bg-primary/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl rotate-12">
              <Trophy className="w-6 h-6 text-background" />
            </div>
            <span className="text-2xl font-black font-display tracking-tight">Arena Prime</span>
          </motion.div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium hidden sm:block">{user.displayName}</span>
                  <button 
                    onClick={() => signOut(auth)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Sign Out
                  </button>
                </div>
                <button 
                  onClick={handleResetAll}
                  className="p-2 text-on-surface-variant hover:text-rose-500 transition-colors relative"
                  title="Reset All Data"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                className="btn-primary text-xs py-2 px-4"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Hero Title */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-extrabold font-display tracking-tighter mb-2">
            Premium IPL Contest <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-on-surface-variant font-bold tracking-[0.2em] text-xs uppercase">
            The Ultimate Fan League Experience
          </p>
        </div>

        {!user ? (
          <div className="text-center py-20 glass-panel">
            <Trophy className="w-20 h-20 text-primary mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold font-display mb-4">Welcome to Arena Prime</h2>
            <p className="text-on-surface-variant mb-8 max-w-md mx-auto text-lg">
              Please sign in with your Google account to view the leaderboard, manage players, and track match predictions.
            </p>
            <button 
              onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
              className="btn-primary py-4 px-10 text-lg shadow-lg shadow-primary/20"
            >
              Sign In with Google
            </button>
          </div>
        ) : (
          <>
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
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Match Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MI vs CSK"
                    value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Match Type</label>
                  <select 
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as MatchType)}
                    className="input-field w-full appearance-none"
                  >
                    {MATCH_TYPES.map(t => (
                      <option key={t.type} value={t.type}>{t.type} League (₹{t.fee} Entry)</option>
                    ))}
                  </select>
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-outline-variant">
                  <span className="text-sm font-bold text-on-surface-variant">Pool Status</span>
                  <span className="text-2xl font-black text-primary">₹{currentTypeConfig.fee * selectedPlayerIds.length}</span>
                </div>
              </div>
            </section>

            <section className="glass-panel p-8">
              <h2 className="text-xl font-bold font-display mb-8">Current Rewards</h2>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">1st Prize Winner</p>
                    <p className="font-bold text-lg">{derivedWinner ? derivedWinner.name : 'Pending...'}</p>
                  </div>
                  <span className="text-xl font-black text-primary">₹{currentTypeConfig.winnerPrize}</span>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-r from-secondary/10 to-transparent border border-secondary/20 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">2nd Prize Runner-up</p>
                    <p className="font-bold text-lg">{derivedRunnerUp ? derivedRunnerUp.name : 'Pending...'}</p>
                  </div>
                  <span className="text-xl font-black text-secondary">₹{currentTypeConfig.runnerUpPrize}</span>
                </div>
              </div>
            </section>

              <div className="space-y-4">
              <button 
                onClick={handleAddMatch}
                className="btn-primary w-full flex items-center justify-center gap-3 py-4"
              >
                <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center">
                  {editingMatchId ? <Edit2 className="w-3 h-3 text-primary" /> : <RotateCcw className="w-3 h-3 text-primary" />}
                </div>
                {editingMatchId ? 'UPDATE MATCH' : 'SAVE & FINALIZE MATCH'}
              </button>
              <button 
                onClick={resetForm}
                className="btn-secondary w-full py-4 uppercase tracking-widest text-xs"
              >
                {editingMatchId ? 'Cancel Edit' : 'Reset Current'}
              </button>
            </div>
          </div>

          {/* Center Column: Player Predictions */}
          <div className="lg:col-span-8 space-y-8">
            <section className="glass-panel p-8 relative overflow-hidden">
              <div className="absolute top-4 right-8 text-6xl font-black text-on-surface/5 pointer-events-none font-display">
                {players.length.toString().padStart(2, '0')}
              </div>
              
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-display mb-1">Match Participants</h2>
                <p className="text-on-surface-variant text-sm">Select the friends playing in this match.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                {players.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => togglePlayerSelection(p.id)}
                    className={`glass-card p-5 transition-all cursor-pointer group ${
                      selectedPlayerIds.includes(p.id) ? 'border-primary/40 bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          selectedPlayerIds.includes(p.id) ? 'bg-primary text-background' : 'bg-surface-bright text-on-surface-variant'
                        }`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
                            {selectedPlayerIds.includes(p.id) ? 'Participating' : 'Sitting Out'}
                          </p>
                        </div>
                      </div>
                      {selectedPlayerIds.includes(p.id) && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <RotateCcw className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => setIsEditingPlayers(true)}
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
                      value={winnerPlayerId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setWinnerPlayerId(val);
                        if (val && val === runnerUpPlayerId) setRunnerUpPlayerId(null);
                      }}
                      className="w-full input-field appearance-none"
                    >
                      <option value="">-- No Winner --</option>
                      {players.filter(p => selectedPlayerIds.includes(p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest">🥈 2nd Prize Runner-up</label>
                    <select 
                      value={runnerUpPlayerId || ''}
                      onChange={(e) => setRunnerUpPlayerId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full input-field appearance-none"
                    >
                      <option value="">-- No Runner-up --</option>
                      {players.filter(p => selectedPlayerIds.includes(p.id) && p.id !== winnerPlayerId).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Section: Standings & History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Season Standings */}
          <div className="lg:col-span-8">
            <section className="glass-panel p-8 h-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold font-display flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                  Season Standings
                </h2>
                <button 
                  onClick={exportCSV}
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
                      <th className="pb-4 font-black text-right">Net P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.playerId} className="group hover:bg-on-surface/[0.02] transition-colors">
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
                        <td className="py-4 text-right">
                          <span className={`font-black ${entry.profit >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                            {entry.profit >= 0 ? '+' : ''}₹{entry.profit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Match History */}
          <div className="lg:col-span-4">
            <section className="glass-panel p-8 h-full">
              <h2 className="text-2xl font-bold font-display mb-8">Match History</h2>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-2">
                  <span>Date</span>
                  <span>Match</span>
                  <span>Outcome</span>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
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
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditMatch(match)}
                          className="p-1.5 rounded-md bg-surface-bright text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit Match"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMatch(match.id)}
                          className="p-1.5 rounded-md bg-surface-bright text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Match"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {matches.length === 0 && (
                    <div className="text-center py-12 text-on-surface-variant text-sm italic">
                      No matches yet
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Player Management Modal */}
      <AnimatePresence>
        {isEditingPlayers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingPlayers(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold font-display">Manage Players</h2>
                <button onClick={() => setIsEditingPlayers(false)} className="p-2 hover:bg-surface-bright rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                {players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 glass-card">
                    <input 
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePlayerName(p.id, e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 font-bold"
                    />
                    <button 
                      onClick={() => removePlayer(p.id)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="New Player Name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="flex-1 input-field"
                    onKeyDown={(e) => e.key === 'Enter' && addNewPlayer()}
                  />
                  <button 
                    onClick={() => addNewPlayer()}
                    className="btn-primary py-2 px-4"
                  >
                    Add
                  </button>
                </div>
                <button 
                  onClick={resetPlayersToDefault}
                  className="w-full text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-widest"
                >
                  Reset to Defaults
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert/Confirm Modal */}
      <AnimatePresence>
        {alertConfig.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlertConfig({ ...alertConfig, show: false })}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-6 text-center"
            >
              <div className="mb-4 flex justify-center">
                <div className={`p-3 rounded-2xl ${alertConfig.isConfirm ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  <RotateCcw className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">{alertConfig.title}</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                {alertConfig.message}
              </p>
              <div className="flex gap-3">
                {alertConfig.isConfirm ? (
                  <>
                    <button 
                      onClick={() => setAlertConfig({ ...alertConfig, show: false })}
                      className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        alertConfig.onConfirm?.();
                        setAlertConfig({ ...alertConfig, show: false });
                      }}
                      className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all"
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setAlertConfig({ ...alertConfig, show: false })}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
                  >
                    OK
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2937;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #374151;
        }
      `}</style>
    </div>
  );
}
