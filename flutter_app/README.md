# Kirana Sahayak — Flutter app (starter scaffold)

This folder has the Dart source (`lib/`) and `pubspec.yaml` for a mobile
client covering login, search, quick-add, cart editing, SEND, and the
Recommendation screen — the same feature set as the web app, minus voice
capture (see below).

**Important — what's real here vs. what isn't yet:**
Unlike the backend, web app, and ML pipeline (all of which were actually
installed and run in a real environment while building this), this Flutter
code was written and manually reviewed but **could not be compiled or run**
in the environment that produced it — there's no Flutter SDK available
there. It should be structurally correct Dart/Flutter, but treat it as
untested until you run it yourself.

## First-time setup (Windows PowerShell, once Flutter SDK + Android Studio
are installed — see the main project's Windows setup section)

This folder only has `lib/` and `pubspec.yaml` — it's missing the
platform-specific `android/`, `ios/`, etc. folders that `flutter create`
normally generates. Bootstrap them into this same folder:

```powershell
cd flutter_app
flutter create . --project-name kirana_sahayak --org com.kiranasahayak
flutter pub get
```

`flutter create .` fills in the missing platform folders around your
existing `lib/` and `pubspec.yaml` without overwriting them (it will ask
before touching anything that already exists — keep your files if prompted).

## Running it

```powershell
flutter devices          # confirm an emulator or device is available
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

`10.0.2.2` is the Android emulator's alias for your host machine's
`localhost` — use your actual Render URL once deployed, or your machine's
LAN IP if testing on a physical device against a locally-running backend.

## Building the demo APK

```powershell
flutter build apk --dart-define=API_BASE_URL=https://your-backend.onrender.com
```

The APK will be at `build\app\outputs\flutter-apk\app-release.apk`.

## iOS

The Dart code has no platform-specific branches, so it's iOS-compatible in
principle — but actually compiling and signing an iOS build requires Xcode
on macOS, which isn't available on a Windows dev machine. Not attempted here.

## What's intentionally not implemented yet

- **Voice capture.** The mic button on the Cart screen shows a message
  explaining it's not wired up rather than pretending to record audio.
  Adding it means picking a recording plugin (e.g. `record`), requesting
  `RECORD_AUDIO` permission on Android / `NSMicrophoneUsageDescription` on
  iOS, and POSTing the clip to `/api/voice/transcribe` exactly like the web
  app's `VoiceButton` does — that's real, working code to copy the shape of.
