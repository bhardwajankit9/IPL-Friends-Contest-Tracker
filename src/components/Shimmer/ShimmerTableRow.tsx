/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const ShimmerTableRow = () => (
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
