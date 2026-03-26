# Build Guide - Gestione Scadenze

## PWA (Web)
Disponibile su Lovable (gestionescadenze.app)

## Desktop Mac/Windows (Electron)
```bash
npm install --legacy-peer-deps
npm run build
npm run electron:build
# Output: dist-electron/
```

## iOS (iPhone/iPad)
Richiede macOS + Xcode (gratuito)
```bash
npm install --legacy-peer-deps
npm run build
npx cap sync ios
npx cap open ios
# In Xcode: seleziona iPhone → Run
```

## Android (APK)
Richiede Android Studio
```bash
npm install --legacy-peer-deps
npm run build
npx cap add android    # solo la prima volta
npm run cap:sync:android
npx cap open android   # apre Android Studio
# In Android Studio: Build → Build APK
```
