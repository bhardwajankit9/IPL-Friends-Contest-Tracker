/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Trash2,
  Share
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';

// --- Types ---

type MatchType = 'Normal' | 'Qualifier' | 'Final' | 'Custom';

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
  winStreak: number;
  badges: string[];
}

interface SharedUser {
  id: string;
  email: string;
  displayName: string;
  grantedAt: number;
  grantedBy: string;
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

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Ankit' },
  { id: 2, name: 'Sumit Baghel' },
  { id: 3, name: 'Nachiket' },
  { id: 4, name: 'Guru' },
  { id: 5, name: 'Pramod Patil' },
];

const SEASONS = ['IPL 2024', 'IPL 2025', 'IPL 2026'];
const CURRENT_SEASON = 'IPL 2026';

// IPL Teams
const IPL_TEAMS = [
  'CSK', 'MI', 'RCB', 'KKR', 'SRH', 'DC', 'PBKS', 'RR', 'LSG', 'GT'
];

// Fee Options
const MATCH_TYPES: { type: MatchType; fee: number }[] = [
  { type: 'Normal', fee: 20 },
  { type: 'Qualifier', fee: 50 },
  { type: 'Final', fee: 100 },
];

// --- Shimmer/Skeleton Components ---

const ShimmerCard = ({ className = "" }: { className?: string }) => (
  <div className={`glass-card p-5 animate-pulse ${className}`}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-surface-bright rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-surface-bright rounded mb-2"></div>
        <div className="h-3 bg-surface-bright rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

const ShimmerTableRow = () => (
  <tr className="animate-pulse">
    <td className="py-4">
      <div className="flex items-center gap-4">
        <div className="w-4 h-4 bg-surface-bright rounded"></div>
        <div className="w-8 h-8 bg-surface-bright rounded-full"></div>
        <div className="h-4 bg-surface-bright rounded w-24"></div>
      </div>
    </td>
    <td className="py-4"><div className="h-4 bg-surface-bright rounded w-16"></div></td>
    <td className="py-4"><div className="h-4 bg-surface-bright rounded w-16"></div></td>
    <td className="py-4 text-right"><div className="h-4 bg-surface-bright rounded w-20 ml-auto"></div></td>
  </tr>
);

const ShimmerMatchHistory = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex flex-col py-3 border-b border-outline-variant/30 last:border-0 animate-pulse">
        <div className="flex justify-between items-center mb-2">
          <div className="h-4 bg-surface-bright rounded w-20"></div>
          <div className="h-4 bg-surface-bright rounded w-24"></div>
          <div className="w-6 h-6 bg-surface-bright rounded-full"></div>
        </div>
        <div className="flex justify-end gap-2">
          <div className="w-6 h-6 bg-surface-bright rounded"></div>
          <div className="w-6 h-6 bg-surface-bright rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

const LoadingSpinner = ({ size = "w-4 h-4" }: { size?: string }) => (
  <div className={`${size} border-2 border-primary/30 border-t-primary rounded-full animate-spin`}></div>
);

// --- Components ---

export default function App() {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isEditingPlayers, setIsEditingPlayers] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<Player | null>(null);
  
  // Loading states for delete/edit operations
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [removingPlayerId, setRemovingPlayerId] = useState<number | null>(null);
  const [resettingData, setResettingData] = useState(false);
  
  // Scroll position management
  const matchHistoryRef = useRef<HTMLDivElement>(null);
  const [matchHistoryScrollTop, setMatchHistoryScrollTop] = useState(0);
  
  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  // Data sharing
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [dataOwner, setDataOwner] = useState<User | null>(null);
  const [isManagingShares, setIsManagingShares] = useState(false);
  const [newShareEmail, setNewShareEmail] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, email: string, displayName: string}>>([]);
  
  // Current Match Entry State
  const [teamA, setTeamA] = useState<string>('');
  const [teamB, setTeamB] = useState<string>('');
  const [feeMode, setFeeMode] = useState<'preset' | 'custom'>('preset');
  const [matchType, setMatchType] = useState<MatchType>('Normal');
  const [customEntryFee, setCustomEntryFee] = useState<number>(20);
  const [winnerPlayerId, setWinnerPlayerId] = useState<number | null>(null);
  const [runnerUpPlayerId, setRunnerUpPlayerId] = useState<number | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [isAddingNewPlayerInModal, setIsAddingNewPlayerInModal] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [currentSeason, setCurrentSeason] = useState<string>(CURRENT_SEASON);
  
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

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: unknown) {
      const code = (error as { code?: string }).code || '';
      const message = (error as { message?: string }).message || String(error);
      if (code === 'auth/popup-blocked') {
        setSignInError('Popup was blocked by the browser. Please allow popups for localhost, or open the app in a regular browser tab (not VS Code Simple Browser).');
      } else if (code === 'auth/unauthorized-domain') {
        setSignInError('This domain is not authorized in Firebase. Go to Firebase Console → Authentication → Settings → Authorized Domains and add "localhost".');
      } else if (code === 'auth/popup-closed-by-user') {
        setSignInError(null); // user closed it themselves
      } else {
        setSignInError(`Sign-in failed: ${code || message}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };


  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Store user information for sharing lookup
  useEffect(() => {
    if (user) {
      const userInfo = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: Date.now()
      };
      
      // Store/update user info in users collection
      setDoc(doc(db, 'users', user.uid), userInfo, { merge: true })
        .then(() => {
          console.log('User info stored for sharing lookup:', userInfo);
          console.log('Document path: users/' + user.uid);
        })
        .catch(error => {
          console.error('Could not store user info:', error);
          showAlert('Warning: Could not store user info for sharing. You may not be able to share data.');
        });
    }
  }, [user]);

  // Check for shared access and load appropriate data
  useEffect(() => {
    if (!isAuthReady || !user) {
      setDataOwner(null);
      setSharedUsers([]);
      return;
    }

    const checkSharedAccess = async () => {
      try {
        // First, check if current user has shared access to any other user's data
        const sharedAccessQuery = query(
          collection(db, 'users'),
          where('shared_users', 'array-contains', user.uid)
        );
        
        const sharedAccessSnapshot = await getDocs(sharedAccessQuery);
        
        if (!sharedAccessSnapshot.empty) {
          // User has shared access - use the first sharer's data
          const sharerDoc = sharedAccessSnapshot.docs[0];
          const sharerData = sharerDoc.data();
          
          // Get sharer user info
          const sharerUser = {
            uid: sharerDoc.id,
            email: sharerData.email || null,
            displayName: sharerData.displayName || null,
            photoURL: sharerData.photoURL || null,
          } as User;
          
          setDataOwner(sharerUser);
        } else {
          // User is the data owner
          setDataOwner(user);
        }

        // Load shared users list (only if user is the data owner)
        if (dataOwner?.uid === user.uid) {
          const sharedUsersQuery = query(collection(db, 'users', user.uid, 'shared_users'));
          const sharedUsersSnapshot = await getDocs(sharedUsersQuery);
          
          const sharedUsersList: SharedUser[] = [];
          sharedUsersSnapshot.forEach((doc) => {
            sharedUsersList.push(doc.data() as SharedUser);
          });
          
          setSharedUsers(sharedUsersList);

          // Load available users for sharing
          const allUsersSnapshot = await getDocs(collection(db, 'users'));
          const availableUsersList: Array<{id: string, email: string, displayName: string}> = [];
          
          allUsersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (doc.id !== user.uid && data.email) { // Exclude current user
              availableUsersList.push({
                id: doc.id,
                email: data.email,
                displayName: data.displayName || data.email
              });
            }
          });
          
          setAvailableUsers(availableUsersList);
        }
      } catch (error) {
        console.error('Error checking shared access:', error);
        setDataOwner(user); // Default to own data
      }
    };

    checkSharedAccess();
  }, [isAuthReady, user, dataOwner]);

  // PWA install prompt

  // PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA: appinstalled event fired');
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user || !dataOwner) {
      setPlayers(DEFAULT_PLAYERS);
      setMatches([]);
      setIsLoadingPlayers(false);
      setIsLoadingMatches(false);
      return;
    }
    
    // Reset to defaults while the new season data loads from Firestore
    setPlayers(DEFAULT_PLAYERS);
    setMatches([]);
    setIsLoadingPlayers(true);
    setIsLoadingMatches(true);

    const dataOwnerId = dataOwner.uid;

    const unsubscribePlayers = onSnapshot(collection(db, 'users', dataOwnerId, 'seasons', currentSeason, 'players'), (snapshot) => {
      const loadedPlayers: Player[] = [];
      snapshot.forEach((doc) => loadedPlayers.push(doc.data() as Player));
      if (loadedPlayers.length > 0) {
        setPlayers(loadedPlayers);
      } else {
        // Show defaults immediately in UI
        setPlayers(DEFAULT_PLAYERS);
        // Try to persist to Firestore (may fail if rules not deployed yet)
        DEFAULT_PLAYERS.forEach(p => {
          setDoc(doc(db, 'users', dataOwnerId, 'seasons', currentSeason, 'players', p.id.toString()), p)
            .catch(err => console.warn('Could not persist default players to Firestore:', err));
        });
      }
      setIsLoadingPlayers(false);
    }, (error) => {
      console.error("Error loading players:", error);
      // Non-fatal: fall back to DEFAULT_PLAYERS so UI is usable
      setPlayers(DEFAULT_PLAYERS);
      setIsLoadingPlayers(false);
    });

    const q = query(collection(db, 'users', dataOwnerId, 'seasons', currentSeason, 'matches'), orderBy('timestamp', 'desc'));
    const unsubscribeMatches = onSnapshot(q, (snapshot) => {
      const loadedMatches: Match[] = [];
      snapshot.forEach((doc) => loadedMatches.push(doc.data() as Match));
      setMatches(loadedMatches);
      setIsLoadingMatches(false);
    }, (error) => {
      console.error("Error loading matches:", error);
      // Non-fatal: matches stay empty
      setIsLoadingMatches(false);
    });

    return () => {
      unsubscribePlayers();
      unsubscribeMatches();
    };
  }, [isAuthReady, user, dataOwner, currentSeason]);

  // Scroll position management for match history
  useEffect(() => {
    const handleScroll = () => {
      if (matchHistoryRef.current) {
        setMatchHistoryScrollTop(matchHistoryRef.current.scrollTop);
      }
    };

    const ref = matchHistoryRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
      return () => ref.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Restore scroll position after matches update
  useEffect(() => {
    if (matchHistoryRef.current && !isLoadingMatches) {
      matchHistoryRef.current.scrollTop = matchHistoryScrollTop;
    }
  }, [matches, isLoadingMatches, matchHistoryScrollTop]);

  // --- Calculations ---
  const currentTypeConfig = useMemo(() =>
    MATCH_TYPES.find(t => t.type === matchType)!,
  [matchType]);

  const currentEntryFee = useMemo(() =>
    feeMode === 'preset' ? currentTypeConfig.fee : customEntryFee,
  [feeMode, currentTypeConfig, customEntryFee]);

  const currentWinnerPrize = useMemo(() =>
    Math.floor(currentEntryFee * selectedPlayerIds.length * 0.8),
  [currentEntryFee, selectedPlayerIds.length]);

  const currentRunnerUpPrize = useMemo(() =>
    Math.floor(currentEntryFee * selectedPlayerIds.length * 0.2),
  [currentEntryFee, selectedPlayerIds.length]);
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
        profit: 0,
        winStreak: 0,
        badges: []
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

    // Calculate win streaks and badges
    const sortedMatches = [...matches].sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    Object.values(board).forEach(entry => {
      entry.profit = entry.won - entry.invested;
      
      // Calculate win streak
      let streak = 0;
      for (const match of sortedMatches) {
        if (match.winnerId === entry.playerId) {
          streak++;
        } else if (match.predictions.some(p => p.playerId === entry.playerId)) {
          // Player participated but didn't win, break streak
          break;
        }
      }
      entry.winStreak = streak;
      
      // Calculate badges
      const totalWins = matches.filter(m => m.winnerId === entry.playerId).length;
      const totalMatches = matches.filter(m => m.predictions.some(p => p.playerId === entry.playerId)).length;
      const winRate = totalMatches > 0 ? totalWins / totalMatches : 0;
      
      // Most Wins badge
      if (totalWins === Math.max(...Object.values(board).map(e => 
        matches.filter(m => m.winnerId === e.playerId).length
      ))) {
        entry.badges.push('Most Wins');
      }
      
      // On a Roll badge (win streak >= 3)
      if (entry.winStreak >= 3) {
        entry.badges.push('On a Roll');
      }
      
      // Comeback King badge (high win rate after losses)
      if (winRate >= 0.6 && totalMatches >= 5) {
        entry.badges.push('Comeback King');
      }
      
      // Champion badge (highest profit)
      if (entry.profit === Math.max(...Object.values(board).map(e => e.profit))) {
        entry.badges.push('Champion');
      }
    });

    return Object.values(board).sort((a, b) => b.profit - a.profit);
  }, [players, matches]);

  // --- Handlers ---
  const handleAddMatch = async () => {
    if (!teamA || !teamB) {
      showAlert('Please select both teams.');
      return;
    }

    if (teamA === teamB) {
      showAlert('Please select different teams.');
      return;
    }

    if (feeMode === 'custom' && customEntryFee <= 0) {
      showAlert('Entry fee must be greater than 0.');
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
    const matchName = `${teamA} vs ${teamB}`;

    const newMatch: Match = {
      id: editingMatchId || Date.now().toString(),
      name: matchName,
      type: feeMode === 'preset' ? matchType : 'Custom',
      entryFee: currentEntryFee,
      totalPool: currentEntryFee * selectedPlayerIds.length,
      predictions: participatingPlayers.map(p => ({ playerId: p.id, predictedWinner: '' })),
      actualWinner: '',
      winnerId: winnerPlayerId,
      runnerUpId: runnerUpPlayerId,
      prizeWinner: winnerPlayerId ? currentWinnerPrize : 0,
      prizeRunnerUp: runnerUpPlayerId ? currentRunnerUpPrize : 0,
      timestamp: editingMatchId ? (matches.find(m => m.id === editingMatchId)?.timestamp || Date.now()) : Date.now()
    };

    try {
      await setDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'matches', newMatch.id), newMatch);
      resetForm();
      setIsAddingMatch(false);
    } catch (error) {
      console.error('Failed to save match:', error);
      // Show more specific error message
      const errorMessage = (error as any)?.code === 'permission-denied' 
        ? 'Permission denied. Please deploy updated Firestore rules to Firebase Console → Firestore → Rules.'
        : 'Failed to save match. Please check permissions.';
      showAlert(errorMessage);
      handleFirestoreError(error, OperationType.WRITE, `users/${dataOwner!.uid}/seasons/${currentSeason}/matches`);
    }
  };

  const resetForm = () => {
    setTeamA('');
    setTeamB('');
    setFeeMode('preset');
    setMatchType('Normal');
    setCustomEntryFee(20);
    setWinnerPlayerId(null);
    setRunnerUpPlayerId(null);
    setSelectedPlayerIds([]);
    setIsAddingNewPlayerInModal(false);
    setEditingMatchId(null);
  };

  const handleSeasonChange = (season: string) => {
    setCurrentSeason(season);
    setIsLoadingPlayers(true);
    setIsLoadingMatches(true);
    resetForm();
  };

  // Player Profile Calculations
  const getPlayerProfileData = (playerId: number) => {
    const playerMatches = matches.filter(match =>
      match.predictions.some(pred => pred.playerId === playerId)
    );

    const wins = playerMatches.filter(match =>
      match.winnerId === playerId || match.runnerUpId === playerId
    ).length;

    const totalInvested = playerMatches.reduce((sum, match) => sum + match.entryFee, 0);

    const totalWon = playerMatches.reduce((sum, match) => {
      if (match.winnerId === playerId) return sum + match.prizeWinner;
      if (match.runnerUpId === playerId) return sum + match.prizeRunnerUp;
      return sum;
    }, 0);

    const profitLoss = totalWon - totalInvested;

    // Profit/Loss over time data for chart
    const profitOverTime = playerMatches
      .sort((a, b) => a.timestamp - b.timestamp)
      .reduce((acc, match) => {
        const invested = match.entryFee;
        let won = 0;
        if (match.winnerId === playerId) won = match.prizeWinner;
        else if (match.runnerUpId === playerId) won = match.prizeRunnerUp;

        const profit = won - invested;
        const lastCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;

        acc.push({
          match: match.name,
          date: new Date(match.timestamp).toLocaleDateString(),
          profit,
          cumulative: lastCumulative + profit
        });
        return acc;
      }, [] as { match: string; date: string; profit: number; cumulative: number }[]);

    return {
      player: players.find(p => p.id === playerId)!,
      totalMatches: playerMatches.length,
      wins,
      totalInvested,
      totalWon,
      profitLoss,
      winRate: playerMatches.length > 0 ? (wins / playerMatches.length * 100).toFixed(1) : '0',
      profitOverTime
    };
  };

  const openPlayerProfile = (playerId: number) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayerProfile(player);
    }
  };

  // Season Summary Statistics
  const seasonSummaryStats = useMemo(() => {
    const totalMatches = matches.length;
    const totalPoolMoney = matches.reduce((sum, match) => sum + match.totalPool, 0);

    // Find biggest winner (highest profit)
    const biggestWinner = leaderboard.length > 0 ? leaderboard[0] : null;

    // Find most active player (most matches participated in)
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
  }, [matches, leaderboard, players]);

  const handleEditMatch = (match: Match) => {
    // Parse team names from match name (format: "TEAM1 vs TEAM2")
    const teams = match.name.split(' vs ');
    if (teams.length === 2) {
      setTeamA(teams[0]);
      setTeamB(teams[1]);
    }

    // Determine fee mode based on match type
    if (match.type === 'Custom') {
      setFeeMode('custom');
      setCustomEntryFee(match.entryFee);
    } else {
      setFeeMode('preset');
      setMatchType(match.type);
      setCustomEntryFee(20); // Reset to default
    }

    setSelectedPlayerIds(match.predictions.map(p => p.playerId));
    setWinnerPlayerId(match.winnerId);
    setRunnerUpPlayerId(match.runnerUpId);
    setEditingMatchId(match.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMatch = (matchId: string) => {
    showConfirm('Are you sure you want to delete this match?', async () => {
      setDeletingMatchId(matchId);
      try {
        await deleteDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'matches', matchId));
        if (editingMatchId === matchId) {
          resetForm();
        }
      } catch (error) {
        showAlert('Failed to delete match.');
        handleFirestoreError(error, OperationType.DELETE, `users/${dataOwner!.uid}/seasons/${currentSeason}/matches`);
      } finally {
        setDeletingMatchId(null);
      }
    });
  };

  const handleResetAll = () => {
    showConfirm(`Are you sure you want to reset all ${currentSeason} data? This cannot be undone.`, async () => {
      setResettingData(true);
      try {
        for (const match of matches) {
          await deleteDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'matches', match.id));
        }
        for (const player of players) {
          await deleteDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'players', player.id.toString()));
        }
        DEFAULT_PLAYERS.forEach(p => {
          setDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'players', p.id.toString()), p).catch(error => handleFirestoreError(error, OperationType.WRITE, `users/${dataOwner!.uid}/seasons/${currentSeason}/players`));
        });
      } catch (error) {
        showAlert('Failed to reset data.');
        handleFirestoreError(error, OperationType.DELETE, `users/${dataOwner!.uid}/seasons/${currentSeason}/matches/players`);
      } finally {
        setResettingData(false);
      }
    }, `Reset ${currentSeason} Data`);
  };

  const exportCSV = () => {
    const headers = ['Player Name', 'Total Invested', 'Total Won', 'Win Streak', 'Badges', 'Net Profit/Loss'];
    const rows = leaderboard.map(e => [e.name, e.invested, e.won, e.winStreak, e.badges.join('; '), e.profit]);
    
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

  const shareMatchToWhatsApp = (match: Match) => {
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
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const shareDataWithUser = async (targetUserId: string) => {
    if (!user || !targetUserId) return;

    // Don't allow sharing with yourself
    if (targetUserId === user.uid) {
      showAlert('You cannot share data with yourself.');
      return;
    }

    try {
      console.log('Sharing data with user:', targetUserId);
      
      // Find user data
      const targetUserInfo = availableUsers.find(u => u.id === targetUserId);
      if (!targetUserInfo) {
        showAlert('User not found.');
        return;
      }

      // Check if already shared
      if (sharedUsers.some(su => su.id === targetUserId)) {
        showAlert('Data access already granted to this user.');
        return;
      }

      // Add to shared_users collection
      const sharedUser: SharedUser = {
        id: targetUserId,
        email: targetUserInfo.email,
        displayName: targetUserInfo.displayName,
        grantedAt: Date.now(),
        grantedBy: user.uid
      };

      await setDoc(doc(db, 'users', user.uid, 'shared_users', targetUserId), sharedUser);

      // Update local state
      setSharedUsers(prev => [...prev, sharedUser]);
      showAlert(`Data access granted to ${sharedUser.displayName || sharedUser.email}`);
    } catch (error) {
      console.error('Error sharing data:', error);
      showAlert('Failed to share data. Please try again.');
    }
  };

  const removeSharedAccess = async (sharedUserId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'shared_users', sharedUserId));
      setSharedUsers(prev => prev.filter(su => su.id !== sharedUserId));
      showAlert('Shared access removed successfully.');
    } catch (error) {
      console.error('Error removing shared access:', error);
      showAlert('Failed to remove shared access.');
    }
  };

  const updatePlayerName = async (id: number, newName: string) => {
    setEditingPlayerId(id);
    const player = players.find(p => p.id === id);
    if (player) {
      try {
        await setDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'players', id.toString()), { ...player, name: newName });
      } catch (error) {
        showAlert('Failed to update player.');
        handleFirestoreError(error, OperationType.WRITE, `users/${dataOwner!.uid}/seasons/${currentSeason}/players`);
      } finally {
        setEditingPlayerId(null);
      }
    }
  };

  const addNewPlayer = async (fromModal = false) => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Date.now(),
      name: newPlayerName.trim()
    };
    // Update local state immediately so UI responds regardless of Firestore
    setPlayers(prev => [...prev, newPlayer]);
    setNewPlayerName('');
    if (fromModal) {
      setSelectedPlayerIds([...selectedPlayerIds, newPlayer.id]);
      setIsAddingNewPlayerInModal(false);
    }
    // Persist to Firestore in background
    try {
      await setDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'players', newPlayer.id.toString()), newPlayer);
    } catch (error) {
      console.warn('Failed to persist new player to Firestore (check rules):', error);
      showAlert('Player added locally, but could not save to cloud. Check Firestore rules in Firebase Console.');
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
      setRemovingPlayerId(id);
      try {
        await deleteDoc(doc(db, 'users', dataOwner!.uid, 'seasons', currentSeason, 'players', id.toString()));
      } catch (error) {
        showAlert('Failed to delete player.');
        handleFirestoreError(error, OperationType.DELETE, `users/${dataOwner!.uid}/seasons/${currentSeason}/players`);
      } finally {
        setRemovingPlayerId(null);
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
            <div>
              <span className="text-2xl font-black font-display tracking-tight">Arena Prime</span>
              {dataOwner && user && dataOwner.uid !== user.uid && (
                <div className="text-xs text-on-surface-variant mt-1">
                  Viewing {dataOwner.displayName || dataOwner.email}'s data
                </div>
              )}
            </div>
          </motion.div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium hidden sm:block">{user.displayName}</span>
                  <button 
                    onClick={() => setIsProfileOpen(true)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    title="Profile"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  {dataOwner && user && dataOwner.uid === user.uid && (
                    <button 
                      onClick={() => setIsManagingShares(true)}
                      className="p-2 text-on-surface-variant hover:text-green-500 transition-colors"
                      title="Share Data Access"
                    >
                      <Share className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => signOut(auth)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Sign Out
                  </button>
                  {isInstallable && (
                    <button 
                      onClick={handleInstallPWA}
                      className="p-2 text-on-surface-variant hover:text-green-500 transition-colors"
                      title="Install App"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <button 
                  onClick={handleResetAll}
                  disabled={resettingData}
                  className="p-2 text-on-surface-variant hover:text-rose-500 transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Reset All Data"
                >
                  {resettingData ? (
                    <LoadingSpinner size="w-5 h-5" />
                  ) : (
                    <RotateCcw className="w-5 h-5" />
                  )}
                </button>
              </>
            ) : (
              <button 
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="btn-primary text-xs py-2 px-4 disabled:opacity-60"
              >
                {isSigningIn ? 'Redirecting...' : 'Sign In'}
              </button>
            )}
          </div>
        </header>

        {/* Hero Title */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-extrabold font-display tracking-tighter mb-2">
            Premium IPL Contest <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-on-surface-variant font-bold tracking-[0.2em] text-xs uppercase">
            The Ultimate Fan League Experience
          </p>
        </div>

        {/* Season Switcher */}
        <div className="mb-10 flex items-center gap-4 flex-wrap">
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Season</span>
          <div className="flex gap-2 flex-wrap">
            {SEASONS.map(season => (
              <button
                key={season}
                onClick={() => handleSeasonChange(season)}
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

        {/* Season Summary Stats Bar */}
        {user && (
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
                <div className="text-3xl font-black text-primary mb-1">{seasonSummaryStats.totalMatches}</div>
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
                <div className="text-3xl font-black text-secondary mb-1">₹{seasonSummaryStats.totalPoolMoney}</div>
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Pool</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-6 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => seasonSummaryStats.biggestWinner && openPlayerProfile(seasonSummaryStats.biggestWinner.playerId)}
                title="Click to view player profile"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="text-lg font-black text-primary mb-1 truncate" title={seasonSummaryStats.biggestWinner?.name || 'N/A'}>
                  {seasonSummaryStats.biggestWinner?.name || 'N/A'}
                </div>
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Biggest Winner</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-6 text-center cursor-pointer hover:bg-secondary/5 transition-colors"
                onClick={() => seasonSummaryStats.mostActivePlayer && openPlayerProfile(seasonSummaryStats.mostActivePlayer.id)}
                title="Click to view player profile"
              >
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <div className="text-lg font-black text-secondary mb-1 truncate" title={seasonSummaryStats.mostActivePlayer?.name || 'N/A'}>
                  {seasonSummaryStats.mostActivePlayer?.name || 'N/A'}
                </div>
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Most Active</div>
              </motion.div>
            </div>
          </div>
        )}

        {!user ? (
          <div className="text-center py-20 glass-panel">
            <Trophy className="w-20 h-20 text-primary mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold font-display mb-4">Welcome to Arena Prime</h2>
            <p className="text-on-surface-variant mb-8 max-w-md mx-auto text-lg">
              Please sign in with your Google account to view the leaderboard, manage players, and track match predictions.
            </p>

            {signInError && (
              <div className="mb-6 mx-auto max-w-lg p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm text-left">
                <p className="font-bold mb-1">⚠️ Sign-in Error</p>
                <p>{signInError}</p>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="btn-primary py-4 px-10 text-lg shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {isSigningIn ? 'Opening Google Sign-In...' : 'Sign In with Google'}
              </button>

              <p className="text-on-surface-variant text-xs mt-2">
                If the popup is blocked,{' '}
                <a
                  href="http://localhost:3000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  open in your default browser
                </a>
                {' '}and try again.
              </p>
            </div>
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
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Select Teams</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={teamA}
                      onChange={(e) => setTeamA(e.target.value)}
                      className="input-field appearance-none"
                    >
                      <option value="">Team A</option>
                      {IPL_TEAMS.map(team => (
                        <option key={team} value={team} disabled={team === teamB}>{team}</option>
                      ))}
                    </select>
                    <div className="flex items-center justify-center text-on-surface-variant font-bold">vs</div>
                    <select
                      value={teamB}
                      onChange={(e) => setTeamB(e.target.value)}
                      className="input-field appearance-none"
                    >
                      <option value="">Team B</option>
                      {IPL_TEAMS.map(team => (
                        <option key={team} value={team} disabled={team === teamA}>{team}</option>
                      ))}
                    </select>
                  </div>
                  {teamA && teamB && (
                    <div className="text-center text-sm font-bold text-primary mt-2">
                      {teamA} vs {teamB}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Entry Fee</label>

                  {/* Fee Mode Toggle */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setFeeMode('preset')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                        feeMode === 'preset'
                          ? 'bg-primary text-background'
                          : 'bg-surface-bright text-on-surface-variant hover:bg-surface-bright/80'
                      }`}
                    >
                      Preset Fees
                    </button>
                    <button
                      onClick={() => setFeeMode('custom')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                        feeMode === 'custom'
                          ? 'bg-primary text-background'
                          : 'bg-surface-bright text-on-surface-variant hover:bg-surface-bright/80'
                      }`}
                    >
                      Custom Fee
                    </button>
                  </div>

                  {feeMode === 'preset' ? (
                    <select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value as MatchType)}
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
                      value={customEntryFee}
                      onChange={(e) => setCustomEntryFee(Number(e.target.value) || 0)}
                      className="input-field w-full"
                    />
                  )}
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-outline-variant">
                  <span className="text-sm font-bold text-on-surface-variant">Pool Status</span>
                  <span className="text-2xl font-black text-primary">₹{currentEntryFee * selectedPlayerIds.length}</span>
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
                  <span className="text-xl font-black text-primary">₹{currentWinnerPrize}</span>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-r from-secondary/10 to-transparent border border-secondary/20 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">2nd Prize Runner-up</p>
                    <p className="font-bold text-lg">{derivedRunnerUp ? derivedRunnerUp.name : 'Pending...'}</p>
                  </div>
                  <span className="text-xl font-black text-secondary">₹{currentRunnerUpPrize}</span>
                </div>
                <div className="text-center text-xs text-on-surface-variant mt-4">
                  {feeMode === 'preset' ? 'Fixed prize amounts' : '40% to winner • 20% to runner-up • 40% to pot'}
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
                {isLoadingPlayers ? (
                  // Show shimmer cards while loading
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i}>
                      <ShimmerCard />
                    </div>
                  ))
                ) : (
                  players.map(p => (
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
                  ))
                )}
                
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
                        <tr
                          key={entry.playerId}
                          className="group hover:bg-on-surface/[0.02] transition-colors cursor-pointer"
                          onClick={() => openPlayerProfile(entry.playerId)}
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
                        </tr>
                      ))
                    )}
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
                              onClick={() => shareMatchToWhatsApp(match)}
                              className="p-2 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 transition-colors"
                              title="Share on WhatsApp"
                            >
                              <Share className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEditMatch(match)}
                              className="p-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary/80 transition-colors"
                              title="Edit Match"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteMatch(match.id)}
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
                      disabled={editingPlayerId === p.id}
                      className="flex-1 bg-transparent border-none focus:ring-0 font-bold disabled:opacity-50"
                    />
                    <button 
                      onClick={() => removePlayer(p.id)}
                      disabled={removingPlayerId === p.id}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {removingPlayerId === p.id ? (
                        <LoadingSpinner size="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
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

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold font-display">Profile</h2>
                <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-surface-bright rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-background" />
                  )}
                </div>
                <h3 className="text-xl font-bold font-display mb-1">{user.displayName || 'Anonymous User'}</h3>
                <p className="text-on-surface-variant text-sm">{user.email}</p>
                <p className="text-on-surface-variant text-xs mt-1">
                  Account created: {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

              {/* Statistics */}
              <div className="space-y-4 mb-8">
                <h4 className="text-lg font-bold font-display mb-4">Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4 text-center">
                    <div className="text-2xl font-black text-primary mb-1">{matches.length}</div>
                    <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Matches</div>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <div className="text-2xl font-black text-secondary mb-1">{players.length}</div>
                    <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Players</div>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <div className="text-2xl font-black text-primary mb-1">₹{matches.reduce((sum, m) => sum + m.totalPool, 0)}</div>
                    <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Pool</div>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <div className="text-2xl font-black text-secondary mb-1">
                      {leaderboard.length > 0 ? leaderboard[0].name : 'N/A'}
                    </div>
                    <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Top Player</div>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    signOut(auth);
                  }}
                  className="w-full btn-secondary py-3 text-sm"
                >
                  Sign Out
                </button>
                <p className="text-xs text-on-surface-variant text-center">
                  Data is automatically saved to your account
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Player Profile Modal */}
      <AnimatePresence>
        {selectedPlayerProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlayerProfile(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-panel p-8 shadow-2xl"
            >
              {(() => {
                const profileData = getPlayerProfileData(selectedPlayerProfile.id);
                return (
                  <>
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-bold font-display">Player Profile</h2>
                      <button onClick={() => setSelectedPlayerProfile(null)} className="p-2 hover:bg-surface-bright rounded-full transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Player Header */}
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                        <Users className="w-8 h-8 text-background" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold font-display mb-1">{profileData.player.name}</h3>
                        <p className="text-on-surface-variant">Season: {currentSeason}</p>
                      </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="glass-card p-4 text-center">
                        <div className="text-2xl font-black text-primary mb-1">{profileData.totalMatches}</div>
                        <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Matches</div>
                      </div>
                      <div className="glass-card p-4 text-center">
                        <div className="text-2xl font-black text-secondary mb-1">{profileData.wins}</div>
                        <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Wins</div>
                      </div>
                      <div className="glass-card p-4 text-center">
                        <div className="text-2xl font-black text-primary mb-1">{profileData.winRate}%</div>
                        <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Win Rate</div>
                      </div>
                      <div className="glass-card p-4 text-center">
                        <div className={`text-2xl font-black mb-1 ${profileData.profitLoss >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                          {profileData.profitLoss >= 0 ? '+' : ''}₹{profileData.profitLoss}
                        </div>
                        <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Net P/L</div>
                      </div>
                    </div>

                    {/* Win Streak & Badges */}
                    {(() => {
                      const leaderboardEntry = leaderboard.find(entry => entry.playerId === selectedPlayerProfile.id);
                      return leaderboardEntry && (
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold font-display">Achievements</h4>
                          </div>
                          <div className="flex items-center gap-6">
                            {leaderboardEntry.winStreak > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">🔥</span>
                                <div>
                                  <div className="text-xl font-black text-orange-500">{leaderboardEntry.winStreak}</div>
                                  <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Win Streak</div>
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              {leaderboardEntry.badges.map((badge, index) => (
                                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                                  <span className="text-lg">
                                    {badge === 'Most Wins' && '🏆'}
                                    {badge === 'On a Roll' && '🔥'}
                                    {badge === 'Comeback King' && '👑'}
                                    {badge === 'Champion' && '🥇'}
                                  </span>
                                  <span className="text-sm font-bold text-primary">{badge}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Financial Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="glass-card p-6">
                        <h4 className="text-lg font-bold font-display mb-4">Financial Summary</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Total Invested</span>
                            <span className="font-bold">₹{profileData.totalInvested}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Total Won</span>
                            <span className="font-bold text-primary">₹{profileData.totalWon}</span>
                          </div>
                          <div className="border-t border-outline-variant pt-3">
                            <div className="flex justify-between">
                              <span className="font-bold">Net Profit/Loss</span>
                              <span className={`font-black ${profileData.profitLoss >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                {profileData.profitLoss >= 0 ? '+' : ''}₹{profileData.profitLoss}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mini Profit/Loss Chart */}
                      <div className="glass-card p-6">
                        <h4 className="text-lg font-bold font-display mb-4">Profit/Loss Trend</h4>
                        {profileData.profitOverTime.length > 0 ? (
                          <div className="space-y-2">
                            {profileData.profitOverTime.slice(-5).map((point, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-on-surface-variant truncate max-w-[120px]" title={point.match}>
                                  {point.match}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-surface-bright rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${point.cumulative >= 0 ? 'bg-primary' : 'bg-rose-500'}`}
                                      style={{
                                        width: `${Math.min(Math.abs(point.cumulative) / Math.max(...profileData.profitOverTime.map(p => Math.abs(p.cumulative))) * 100, 100)}%`
                                      }}
                                    ></div>
                                  </div>
                                  <span className={`font-bold w-16 text-right ${point.cumulative >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                    {point.cumulative >= 0 ? '+' : ''}₹{point.cumulative}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-on-surface-variant py-8">
                            No matches played yet
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match History */}
                    <div className="glass-card p-6">
                      <h4 className="text-lg font-bold font-display mb-4">Match History</h4>
                      {profileData.profitOverTime.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                          {profileData.profitOverTime.map((point, index) => {
                            const match = matches.find(m => m.name === point.match);
                            const isWinner = match?.winnerId === selectedPlayerProfile.id;
                            const isRunnerUp = match?.runnerUpId === selectedPlayerProfile.id;

                            return (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-outline-variant/30 last:border-0">
                                <div className="flex-1">
                                  <div className="font-bold">{point.match}</div>
                                  <div className="text-xs text-on-surface-variant">{point.date}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {isWinner && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">🏆 WINNER</span>}
                                  {isRunnerUp && <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded-full font-bold">🥈 RUNNER-UP</span>}
                                  <div className="text-right">
                                    <div className={`font-bold ${point.profit >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                      {point.profit >= 0 ? '+' : ''}₹{point.profit}
                                    </div>
                                    <div className="text-xs text-on-surface-variant">Profit</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-on-surface-variant py-8">
                          No matches played yet
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Data Sharing Management Modal */}
      <AnimatePresence>
        {isManagingShares && user && dataOwner && dataOwner.uid === user.uid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManagingShares(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-panel p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold font-display">Share Data Access</h2>
                <button onClick={() => setIsManagingShares(false)} className="p-2 hover:bg-surface-bright rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Shared Users */}
              <div className="mb-8">
                <h3 className="text-lg font-bold font-display mb-4">Currently Shared With</h3>
                {sharedUsers.length > 0 ? (
                  <div className="space-y-3">
                    {sharedUsers.map(sharedUser => (
                      <div key={sharedUser.id} className="flex items-center justify-between p-3 glass-card">
                        <div>
                          <div className="font-bold">{sharedUser.displayName || sharedUser.email}</div>
                          <div className="text-xs text-on-surface-variant">
                            Granted: {new Date(sharedUser.grantedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => removeSharedAccess(sharedUser.id)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove access"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-on-surface-variant py-8">
                    No users have access to your data yet
                  </div>
                )}
              </div>

              {/* Add New User */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold font-display">Grant Access to New User</h3>
                {availableUsers.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          shareDataWithUser(e.target.value);
                          e.target.value = ''; // Reset selection
                        }
                      }}
                      className="flex-1 input-field appearance-none"
                    >
                      <option value="">Select a user...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.displayName || user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-center text-on-surface-variant py-4">
                    No other users available to share with
                  </div>
                )}
                <p className="text-xs text-on-surface-variant">
                  Select a user from the dropdown to grant them access to all your data.
                  They will be able to view and manage your IPL contest data.
                </p>
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
