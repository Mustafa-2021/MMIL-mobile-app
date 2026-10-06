# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MMIL: a bare React Native 0.87 (TypeScript) company app (`com.mmil.app`, min SDK 24). Today it contains the task system built for the purchase department; it is being extended in phases into three sections — **Team** (the existing task system, becoming multi-department), **Visitor** (gate pass: visitor web form via QR → guard photo → officer approve/reject → digital pass → exit), and **HR** (placeholder) — behind an Employee ID + DOB + phone-OTP login with a super admin. Backend is Firebase project `purchase-team-app`: phone-OTP Auth, Firestore, Cloud Storage, FCM, Cloud Functions (`asia-south1`), and Hosting (`web/`, the visitor form/pass in Phase 3). One codebase targets Android and iOS; write every feature for both. Android is built on this Windows machine; iOS can only be compiled on the user's Mac, so iOS changes made here are unverified until then. iOS setup: bundle ID `com.mmil.app`, `ios/MMILPurchase/GoogleService-Info.plist` (registered in the Xcode project), `FirebaseApp.configure()` in `AppDelegate.swift`, Firebase via CocoaPods as static frameworks (`$RNFirebaseDisableSPM`, `$RNFirebaseAsStaticFramework` in the `Podfile`), phone-auth URL scheme = the iOS Encoded App ID. The Xcode project/target is still named `MMILPurchase` (internal only; the display name is MMIL). Push on iOS additionally needs the Push Notifications capability and an APNs key in Firebase, both done on the Mac.

The project must stay at a short path (`C:\Mustafa\MMILPUR`): the Android CMake/ninja build hits Windows' 260-char path limit otherwise. If moved, re-run `npm install` (native caches embed absolute paths).

## Commands

```bash
npm install
npm start                 # Metro dev server
npm run android           # build + install debug build on device/emulator
npm run lint              # eslint (@react-native config)
npm test                  # jest; single test: npx jest __tests__/App.test.tsx
npx tsc --noEmit          # type-check

cd android && ./gradlew assembleRelease   # signed APK -> android/app/build/outputs/apk/release/app-release.apk

cd functions && npm run deploy            # firebase deploy --only functions
firebase deploy --only storage            # storage.rules
firebase deploy --only firestore:rules    # firestore.rules
firebase deploy --only hosting            # web/
```

Release signing uses `android/app/keystore/mmil-purchase-release.keystore` with passwords in `android/keystore.properties` (both git-ignored and unrecoverable — never delete or regenerate). Prettier: single quotes, trailing commas, `arrowParens: 'avoid'`.

## Architecture

**Layering:** `screens/` → `hooks/` (realtime subscriptions wrapped in React state) → `services/` (all Firebase calls). Screens should not talk to Firebase directly; add a service function. Uses the **modular** `@react-native-firebase` API (`getFirestore()`, `doc()`, `onSnapshot()`…), not the namespaced `firestore().collection()` style.

**Startup:** `index.js` calls `initFirebase()` (enables Firestore offline persistence — must run before any other Firestore call) and registers no-op background handlers. `App.tsx` wraps `PaperProvider` (theme in `src/theme/theme.ts`) → `AuthProvider` → `AppNavigator`.

**Auth / routing (`src/navigation/AppNavigator.tsx`):** the root stack switches on auth state from `useAuth`:
1. No Firebase user → `Start` / `Signup` / `Login` (phone OTP; numbers normalized to +91 E.164 via `toE164`).
2. User but no profile or no `teamId` → `Onboarding` (create team → admin, or join with 6-digit invite code → member). Signup details entered before OTP are held in-memory by `services/pendingSignup.ts` and consumed after verification.
3. Otherwise → `Main` = `AdminTabNavigator` or `MemberTabNavigator` by `profile.role`, plus `CreateTask`, `TaskDetail`, `Profile` stack screens.
After changing the user's `role`/`teamId`, call `refreshProfile()` — the profile is loaded once, not subscribed.

**Data model (Firestore):** `teams`, `users/{uid}` (`role`, `teamId`, `fcmToken`), `tasks` (with `extensionHistory[]` of rounds `R1, R2…` and optional single `attachment`), `tasks/{id}/comments` subcollection, `notifications`. Types in `src/types/index.ts`. Timestamps are epoch millis (`Date.now()`), not Firestore Timestamps. Queries avoid `where` + `orderBy` on different fields (sorting happens client-side) to avoid needing composite indexes. Deletes don't cascade: `deleteTask` manually removes comments and the Storage attachment. Admin vs. member permissions are enforced in the UI (e.g. `isAdmin` checks in `TaskDetailScreen`); `firestore.rules` is currently a signed-in-only baseline and gets role-based rules in Phase 1.

**Notifications pipeline:** the app never sends pushes directly. It writes a doc to `notifications` via `notifyUser()` (used for assignment, comments, extension requests, status changes); the `pushOnNotification` Cloud Function (`functions/index.js`) sends the FCM push to that user's `fcmToken` and clears stale tokens. `dailyTaskReminder` runs at 9:00 AM IST. The Android channel id `'tasks'` must match in both `src/services/notifications.ts` and `functions/index.js`. Foreground pushes are displayed via Notifee; tapping any notification with a `taskId` navigates to `TaskDetail` (handled in `AppNavigator`). The FCM token is cleared on sign-out. (The README's "local 10 AM Notifee reminder" note is outdated — it was replaced by the Cloud Function.)

**Attachments:** one file per task, max 10 MB (enforced in `services/attachments.ts` and `storage.rules`), stored at `tasks/{taskId}/{timestamp}_{name}`. A Storage lifecycle rule deletes objects after 45 days; `ATTACHMENT_RETENTION_DAYS` must match it, and the UI treats older attachments as expired.

**Reports:** `services/reports.ts` builds an `.xlsx` with SheetJS and hands it to the share sheet (Android 10+ can't write to public Downloads directly).
