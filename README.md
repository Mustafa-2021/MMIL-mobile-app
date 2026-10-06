# MMIL

A React Native (bare CLI, TypeScript) company app backed by Firebase (Auth phone OTP,
Firestore, Storage, Cloud Messaging, Cloud Functions, Hosting). It currently contains the
purchase department's task system (tasks, assignees, priorities, due dates and extensions, with
an admin/member workflow) and is being extended in phases:

| Phase | Scope |
|---|---|
| 0 | Foundation: rename to MMIL (`com.mmil.app`), Firestore rules + Hosting config in the repo |
| 1 | Employee ID + DOB + phone-OTP login, super admin (HR list import, roles, lockout, deactivation) |
| 2 | Home screen with HR (coming soon) / Visitor / Team sections; Team becomes multi-department |
| 3 | Visitor web form (QR at the gate) + live digital gate pass, hosted on Firebase Hosting |
| 4 | Visitor screens in the app: guard, officer approve/reject, Meeting done, exit |
| 5 | iOS build (on a Mac) and Play Store / App Store preparation |
| 6 | Extras: SMS/WhatsApp pass link, approve from notification, visitor register export |

## Prerequisites (already set up on this machine)

- JDK 17 (Temurin) — `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`
- Android SDK — `C:\Android\sdk` (platform-tools, platforms 34/35, build-tools 34/35, NDK 27.1.12297006, cmake 3.22.1)
- `JAVA_HOME` and `ANDROID_HOME` are set as user environment variables. **Open a new terminal**
  (or restart VS Code) after this setup so the variables take effect.

## Firebase setup

- `android/app/google-services.json` must be the one downloaded for the `com.mmil.app` package
  (Project settings → Your apps → Android app `com.mmil.app`).
- **Important:** open the Firebase console → Authentication → Sign-in method → Phone, and enable it.
- **Important:** add these SHA certificate fingerprints under Project settings → your Android app,
  so Phone Auth can verify silently without falling back to a reCAPTCHA web view:
  - Debug: `SHA1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
  - Release: `SHA1 40:C1:A7:CD:B6:EA:76:3C:BE:CF:46:B2:8B:38:9F:11:63:41:3F:7F`
  - (SHA256 values are also available — ask if you need them for Play Integrity.)
- Make sure Firestore is created (in Native mode) and Cloud Messaging is enabled for the project.

## Running in development

```bash
npm install
npm run android   # builds & installs a debug build on a connected device/emulator
```

## Building the signed release APK

A release keystore was generated at `android/app/keystore/mmil-purchase-release.keystore`
(alias `mmil-purchase-key`); its password is stored in `android/keystore.properties`
(git-ignored — back both files up somewhere safe, they cannot be recovered if lost).

```bash
cd android
./gradlew assembleRelease
```

The signed APK is produced at `android/app/build/outputs/apk/release/app-release.apk`.

## Firestore data model

- `/teams/{teamId}` — `{ name, inviteCode, adminUid, createdAt }`
- `/users/{uid}` — `{ name, phone, role, teamId, fcmToken, createdAt }`
- `/tasks/{taskId}` — `{ title, description, assigneeUid, assigneeName, createdBy, teamId, priority, category, status, dueDate, extensionHistory[], createdAt, updatedAt }`
- `/notifications/{id}` — in-app notification log per user

## Notes on deviations from the original spec

- **Min SDK is 24, not 21.** React Native 0.87 itself requires API 24+ (Firebase's SDKs also
  dropped API 21/22/23 support), so the project targets Android 7.0+ instead.
- **Project lives at `C:\Mustafa\MMILPUR`, not the original folder.** Android's native build
  tools (CMake/ninja) hit Windows' 260-character path limit under the original path (which had
  a space in it), so the whole project was moved to this short path — keep it short if you move
  it again, and re-run `npm install` if you do since some native build caches embed absolute paths.
- **Daily reminder** is sent at 9:00 AM IST by the `dailyTaskReminder` Cloud Function
  (`functions/index.js`), replacing the earlier locally scheduled 10 AM Notifee reminder.
- **Excel export to "Downloads"**: Android 10+ blocks apps from writing directly into the public
  Downloads folder without scoped-storage APIs. The app generates the `.xlsx` file and opens the
  native Share sheet so you can save it to Downloads (or anywhere else, e.g. WhatsApp, email) in
  one tap; on older devices it writes directly into Downloads first.
