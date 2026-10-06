# MMIL Purchase

A React Native (bare CLI, TypeScript) Android app for a company's purchase department to
manage tasks, assignees, priorities, due dates and extensions, with an admin/member workflow
backed by Firebase (Auth phone OTP, Firestore, Cloud Messaging).

## Prerequisites (already set up on this machine)

- JDK 17 (Temurin) — `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`
- Android SDK — `C:\Android\sdk` (platform-tools, platforms 34/35, build-tools 34/35, NDK 27.1.12297006, cmake 3.22.1)
- `JAVA_HOME` and `ANDROID_HOME` are set as user environment variables. **Open a new terminal**
  (or restart VS Code) after this setup so the variables take effect.

## Firebase setup

- `android/app/google-services.json` is already in place for the `com.mmil.purchase` package.
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
- **Daily 10 AM reminder** is implemented as a locally scheduled notification (via Notifee),
  rescheduled to tomorrow's 10 AM whenever the app opens with pending tasks, rather than a
  Firebase Cloud Function — Cloud Functions require the Blaze (pay-as-you-go) billing plan and a
  separate `firebase deploy`, which wasn't set up here. A Cloud Function is a straightforward
  follow-up if you want a true server-side trigger that doesn't depend on the app having run recently.
- **Excel export to "Downloads"**: Android 10+ blocks apps from writing directly into the public
  Downloads folder without scoped-storage APIs. The app generates the `.xlsx` file and opens the
  native Share sheet so you can save it to Downloads (or anywhere else, e.g. WhatsApp, email) in
  one tap; on older devices it writes directly into Downloads first.
