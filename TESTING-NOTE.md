# The Void scroll fix

This build separates the modal backdrop from the sheet so the backdrop no longer participates in scroll gestures.

The Void now receives a fixed, bounded panel height while open, and its recipe list uses the remaining space as a true flex ScrollView. Return and Empty-the-void controls have Android touch sounds disabled so a cancelled drag cannot produce a click sound.

App version: 1.0.3
Android versionCode: 6

For local testing:

```bash
npm install
npx expo start -c
```

For an installed build, create and install a fresh 1.0.3 APK/AAB so an older compatible OTA bundle cannot mask the source changes.
