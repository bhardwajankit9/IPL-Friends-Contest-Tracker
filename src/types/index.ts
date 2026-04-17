/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MatchType = 'Normal' | 'Qualifier' | 'Final' | 'Custom' | 'Tie';

export interface Player {
  id: number;
  name: string;
}

export interface Prediction {
  playerId: number;
  predictedWinner: string;
}

export interface Match {
  id: string;
  name: string;
  type: MatchType;
  entryFee: number;
  totalPool: number;
  predictions: Prediction[];
  actualWinner: string;
  winnerId: number | null;
  runnerUpId: number | null;
  isTie: boolean;              // Flag: match ended in a tie (no winner, no investment)
  prizeWinner: number;
  prizeRunnerUp: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  playerId: number;
  name: string;
  invested: number;
  won: number;
  profit: number;
  winStreak: number;
  badges: string[];
}

export interface SharedUser {
  id: string;
  email: string;
  displayName: string;
  grantedAt: number;
  grantedBy: string;
  canWrite: boolean; // true = Read & Write, false = Read Only
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
}

export interface AlertConfig {
  show: boolean;
  message: string;
  title?: string;
  onConfirm?: () => void;
  isConfirm?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any; // Firestore Timestamp
  lastLoginAt: any; // Firestore Timestamp
  shared_users?: string[]; // Array of UIDs who have access to this user's data
}
