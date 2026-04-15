/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export function useAuth(isAuthReady: boolean, user: User | null) {
  console.log('🔧 useAuth hook called - isAuthReady:', isAuthReady, 'user:', user?.email || 'null');
  const [dataOwner, setDataOwner] = useState<User | null>(null);

  // Store user information for sharing lookup
  useEffect(() => {
    if (user) {
      const userInfo = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: Date.now()
      };
      
      setDoc(doc(db, 'users', user.uid), userInfo, { merge: true })
        .then(() => {
          console.log('User info stored for sharing lookup:', userInfo);
          console.log('Document path: users/' + user.uid);
        })
        .catch(error => {
          console.error('Could not store user info:', error);
        });
    }
  }, [user]);

  // Check for shared access
  useEffect(() => {
    if (!isAuthReady || !user) {
      setDataOwner(null);
      return;
    }

    const checkSharedAccess = async () => {
      try {
        console.log('🔍 [useAuth] Starting shared access check for user:', user.email, 'uid:', user.uid);
        
        // Get all user documents
        const usersSnapshot = await getDocs(collection(db, 'users'));
        console.log('📋 [useAuth] Total users in database:', usersSnapshot.docs.length);
        
        // Check each user's shared_users subcollection for the current user
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          console.log(`🔎 [useAuth] Checking user: ${userData.email} (${userDoc.id})`);
          
          // Skip checking the current user's own document
          if (userDoc.id === user.uid) {
            console.log('  ↪️ Skipping self');
            continue;
          }
          
          // Check if current user is in this user's shared_users subcollection
          const sharedUsersPath = `users/${userDoc.id}/shared_users`;
          console.log(`  📂 Checking path: ${sharedUsersPath}`);
          
          const sharedUserSnapshot = await getDocs(
            collection(db, 'users', userDoc.id, 'shared_users')
          );
          
          console.log(`  📊 Found ${sharedUserSnapshot.docs.length} shared users in this collection`);
          
          if (sharedUserSnapshot.docs.length > 0) {
            const sharedUserIds = sharedUserSnapshot.docs.map(doc => ({
              id: doc.id,
              email: doc.data().email
            }));
            console.log('  📝 Shared user IDs:', sharedUserIds);
          }
          
          const hasAccess = sharedUserSnapshot.docs.some(doc => doc.id === user.uid);
          console.log(`  🔐 Current user (${user.uid}) has access:`, hasAccess);
          
          if (hasAccess) {
            const sharerData = userDoc.data();
            
            const sharerUser = {
              uid: userDoc.id,
              email: sharerData.email || null,
              displayName: sharerData.displayName || null,
              photoURL: sharerData.photoURL || null,
            } as User;
            
            console.log('✅ [useAuth] Found shared access from:', sharerData.email);
            console.log('✅ [useAuth] Setting dataOwner to:', sharerUser);
            setDataOwner(sharerUser);
            return;
          }
        }
        
        // No shared access found, user is their own data owner
        console.log('ℹ️ [useAuth] No shared access found, using own data');
        console.log('ℹ️ [useAuth] Setting dataOwner to self:', user.email);
        setDataOwner(user);
      } catch (error) {
        console.error('❌ [useAuth] Error checking shared access:', error);
        setDataOwner(user);
      }
    };

    checkSharedAccess();
  }, [isAuthReady, user]);

  return { dataOwner };
}
