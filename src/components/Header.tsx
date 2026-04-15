/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, Download, RotateCcw, Share } from 'lucide-react';
import { User } from 'firebase/auth';
import { LoadingSpinner } from './Shimmer';

interface HeaderProps {
  user: User | null;
  dataOwner: User | null;
  isSigningIn: boolean;
  resettingData: boolean;
  isInstallable: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onProfileOpen: () => void;
  onManageShares: () => void;
  onResetAll: () => void;
  onInstallPWA: () => void;
}

export function Header({
  user,
  dataOwner,
  isSigningIn,
  resettingData,
  isInstallable,
  onSignIn,
  onSignOut,
  onProfileOpen,
  onManageShares,
  onResetAll,
  onInstallPWA
}: HeaderProps) {
  return (
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
                onClick={onProfileOpen}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                title="Profile"
              >
                <Users className="w-5 h-5" />
              </button>
              {dataOwner && user && dataOwner.uid === user.uid && (
                <button 
                  onClick={onManageShares}
                  className="p-2 text-on-surface-variant hover:text-green-500 transition-colors"
                  title="Share Data Access"
                >
                  <Share className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={onSignOut}
                className="btn-secondary text-xs py-2 px-4"
              >
                Sign Out
              </button>
              {isInstallable && (
                <button 
                  onClick={onInstallPWA}
                  className="p-2 text-on-surface-variant hover:text-green-500 transition-colors"
                  title="Install App"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
            <button 
              onClick={onResetAll}
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
            onClick={onSignIn}
            disabled={isSigningIn}
            className="btn-primary text-xs py-2 px-4 disabled:opacity-60"
          >
            {isSigningIn ? 'Redirecting...' : 'Sign In'}
          </button>
        )}
      </div>
    </header>
  );
}
