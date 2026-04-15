/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const ShimmerMatchHistory = () => (
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
