# 🐛 Debug Guide - Data Sharing Issue

## Step 1: Open the Browser Console

### On Chrome/Edge:
1. Press `F12` OR `Cmd + Option + I` (Mac) OR `Ctrl + Shift + I` (Windows)
2. Click the **Console** tab
3. You should see logs starting with emojis like 🚀 🔐 📊

### On Safari:
1. First enable Developer menu: Safari → Preferences → Advanced → Check "Show Develop menu"
2. Press `Cmd + Option + C`
3. Click the **Console** tab

### On Firefox:
1. Press `F12` OR `Cmd + Option + K` (Mac) OR `Ctrl + Shift + K` (Windows)
2. Click the **Console** tab

## Step 2: Clear Old Logs
1. In the console, click the 🚫 (clear) icon
2. Refresh the page (F5 or Cmd+R)

## Step 3: Look for These Logs

You should immediately see:
```
🚀 APP STARTED - IPL Friends Contest Tracker loaded
🔐 Setting up auth listener
🔧 useAuth hook called - isAuthReady: false user: null
```

## Step 4: Test the Complete Flow

### A. Login with vansh13041992@gmail.com (Data Owner)
1. Click "Sign in with Google"
2. Select vansh13041992@gmail.com
3. **Look for these logs:**
   ```
   🔐 Auth state changed - user: vansh13041992@gmail.com
   ✅ New user profile created: vansh13041992@gmail.com (or)
   ✅ User profile updated: vansh13041992@gmail.com
   🔧 useAuth hook called - isAuthReady: true user: vansh13041992@gmail.com
   🔍 [useAuth] Starting shared access check for user: vansh13041992@gmail.com
   📋 [useAuth] Total users in database: X
   ℹ️ [useAuth] No shared access found, using own data
   📊 [loadData] Loading data for season: IPL 2025
   📊 [loadData] Current user: vansh13041992@gmail.com
   📊 [loadData] Data owner: vansh13041992@gmail.com
   ```

### B. Share Data with bahrdwajankit9999@gmail.com
1. Click the "Share Data" button (or User icon if there's a dropdown)
2. Select bahrdwajankit9999@gmail.com from dropdown
3. **Look for these logs:**
   ```
   🔄 [shareData] Starting data share process
   🔄 [shareData] From user: vansh13041992@gmail.com uid: {uid}
   🔄 [shareData] To user ID: {uid}
   ✅ [shareData] Target user found: bahrdwajankit9999@gmail.com
   📝 [shareData] Writing to path: users/{vansh_uid}/shared_users/{ankit_uid}
   📝 [shareData] Document data: {id, email, displayName, ...}
   ✅ [shareData] Successfully wrote shared user document
   ✅ [shareData] Data sharing completed successfully
   ```

### C. Login with bahrdwajankit9999@gmail.com (Should See Shared Data)
1. Sign out
2. Sign in with bahrdwajankit9999@gmail.com
3. **Look for these CRITICAL logs:**
   ```
   🔐 Auth state changed - user: bahrdwajankit9999@gmail.com
   ✅ User profile updated: bahrdwajankit9999@gmail.com
   🔧 useAuth hook called - isAuthReady: true user: bahrdwajankit9999@gmail.com
   🔍 [useAuth] Starting shared access check for user: bahrdwajankit9999@gmail.com uid: {ankit_uid}
   📋 [useAuth] Total users in database: 2 (or more)
   
   🔎 [useAuth] Checking user: vansh13041992@gmail.com ({vansh_uid})
   📂 Checking path: users/{vansh_uid}/shared_users
   📊 Found 1 shared users in this collection
   📝 Shared user IDs: [{id: "{ankit_uid}", email: "bahrdwajankit9999@gmail.com"}]
   🔐 Current user ({ankit_uid}) has access: true
   ✅ [useAuth] Found shared access from: vansh13041992@gmail.com
   ✅ [useAuth] Setting dataOwner to: {vansh user object}
   
   📊 [loadData] Loading data for season: IPL 2025
   📊 [loadData] Current user: bahrdwajankit9999@gmail.com uid: {ankit_uid}
   📊 [loadData] Data owner: vansh13041992@gmail.com uid: {vansh_uid}  👈 SHOULD BE VANSH!
   📂 [loadData] Players path: users/{vansh_uid}/seasons/IPL 2025/players
   📂 [loadData] Matches path: users/{vansh_uid}/seasons/IPL 2025/matches
   ✅ [loadData] Players snapshot received, size: X
   ✅ [loadData] Loaded X players
   ✅ [loadData] Matches snapshot received, size: X
   ✅ [loadData] Loaded X matches
   ```

## What to Do:

### If you see NO logs at all:
- Make sure you opened the Console tab (not Elements or Network)
- Try hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + F5` (Windows)
- Check if you're on http://localhost:3001/ (not 3000)

### If you see logs but data sharing fails:
**Copy ALL the console output** and send it to me. Specifically:
- The logs from step C above
- Any red error messages
- The value of `has access: true/false`
- The UIDs being compared

### If you see errors:
Look for:
- ❌ red error messages
- "Permission denied" - means Firestore rules need to be deployed
- "User not found" - means the other user hasn't logged in yet

## Current Server:
- URL: http://localhost:3001/
- Status: Running (should auto-reload on code changes)

## Quick Test:
1. Open http://localhost:3001/
2. Open Console (F12)
3. Look for: `🚀 APP STARTED`
4. If you see it, the app is working!
5. If not, send me a screenshot of what you see
