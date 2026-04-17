/**
 * Migration script: Update Normal match entry fee from ₹20 → ₹40
 * Run with: node scripts/migrate-normal-fee.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "enhanced-layout-474910-d5",
  appId: "1:861056741203:web:804774047b7dd8a0547ba6",
  apiKey: "AIzaSyBuZk4TLRkfRlN3kved_6pAtfq8M4qi9ZE",
  authDomain: "enhanced-layout-474910-d5.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ad2efe37-a56a-45c2-966e-79947ea29293",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const OLD_FEE = 20;
const NEW_FEE = 40;

async function migrateMatches() {
  console.log('🚀 Starting migration: Normal match fee ₹20 → ₹40\n');

  // Get all users
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Found ${usersSnap.size} user(s)\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    console.log(`👤 Processing user: ${userId}`);

    // Get all seasons
    const seasonsSnap = await getDocs(collection(db, 'users', userId, 'seasons'));

    for (const seasonDoc of seasonsSnap.docs) {
      const seasonId = seasonDoc.id;
      console.log(`  📅 Season: ${seasonId}`);

      // Get all matches in this season
      const matchesSnap = await getDocs(collection(db, 'users', userId, 'seasons', seasonId, 'matches'));

      for (const matchDoc of matchesSnap.docs) {
        const match = matchDoc.data();

        // Only update Normal type matches with old ₹20 fee
        if (match.type === 'Normal' && match.entryFee === OLD_FEE) {
          const playerCount = match.predictions?.length || 0;
          const newTotalPool = NEW_FEE * playerCount;
          const newPrizeWinner = Math.floor(newTotalPool * 0.8);
          const newPrizeRunnerUp = Math.floor(newTotalPool * 0.2);

          await updateDoc(doc(db, 'users', userId, 'seasons', seasonId, 'matches', matchDoc.id), {
            entryFee: NEW_FEE,
            totalPool: newTotalPool,
            prizeWinner: match.winnerId ? newPrizeWinner : 0,
            prizeRunnerUp: match.runnerUpId ? newPrizeRunnerUp : 0,
          });

          console.log(`    ✅ Updated: ${match.name} | Players: ${playerCount} | Pool: ₹${match.totalPool} → ₹${newTotalPool} | Winner Prize: ₹${match.prizeWinner} → ₹${newPrizeWinner}`);
          totalUpdated++;
        } else {
          console.log(`    ⏭️  Skipped: ${match.name} (type: ${match.type}, fee: ₹${match.entryFee})`);
          totalSkipped++;
        }
      }
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Updated: ${totalUpdated} matches`);
  console.log(`   Skipped: ${totalSkipped} matches`);
  process.exit(0);
}

migrateMatches().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
