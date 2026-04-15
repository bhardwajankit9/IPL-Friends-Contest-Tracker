/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const ShimmerCard = ({ className = "" }: { className?: string }) => (
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
