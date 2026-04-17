/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { SharedUser } from '../types';

export function useDataSharing(user: User | null, dataOwner: User | null) {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, email: string, displayName: string}>>([]);

  useEffect(() => {
    if (!user || !dataOwner || dataOwner.uid !== user.uid) {
      setSharedUsers([]);
      setAvailableUsers([]);
      return;
    }

    // Real-time listener for shared_users so state is always fresh
    const unsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'shared_users'),
      (snapshot) => {
        const sharedUsersList: SharedUser[] = [];
        snapshot.forEach((doc) => {
          sharedUsersList.push(doc.data() as SharedUser);
        });
        setSharedUsers(sharedUsersList);
      },
      (error) => {
        console.error('Error listening to shared users:', error);
      }
    );

    // Load all users once for the available-users dropdown
    getDocs(collection(db, 'users'))
      .then((allUsersSnapshot) => {
        const availableUsersList: Array<{id: string, email: string, displayName: string}> = [];
        allUsersSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Available user found:', doc.id, data.email, data.displayName);
          if (doc.id !== user.uid && data.email) {
            availableUsersList.push({
              id: doc.id,
              email: data.email,
              displayName: data.displayName || data.email
            });
          }
        });
        console.log('Total available users for sharing:', availableUsersList.length);
        setAvailableUsers(availableUsersList);
      })
      .catch((error) => {
        console.error('Error loading available users:', error);
      });

    return () => unsubscribe();
  }, [user, dataOwner]);

  return { sharedUsers, setSharedUsers, availableUsers };
}
