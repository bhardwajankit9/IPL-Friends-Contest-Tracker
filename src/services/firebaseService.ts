/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { OperationType, FirestoreErrorInfo, UserProfile } from '../types';

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Save or update user profile in Firestore when they sign in
 */
export async function saveUserProfile(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    
    // Check if user already exists
    const userDoc = await getDoc(userRef);
    
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    };

    if (!userDoc.exists()) {
      // New user - add createdAt timestamp
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
      console.log('✅ New user profile created:', user.email);
    } else {
      // Existing user - update last login and profile info
      await setDoc(userRef, userData, { merge: true });
      console.log('✅ User profile updated:', user.email);
    }
  } catch (error) {
    console.error('❌ Error saving user profile:', error);
    throw error;
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}
