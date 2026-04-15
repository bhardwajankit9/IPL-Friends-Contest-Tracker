/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const LoadingSpinner = ({ size = "w-4 h-4" }: { size?: string }) => (
  <div className={`${size} border-2 border-primary/30 border-t-primary rounded-full animate-spin`}></div>
);
