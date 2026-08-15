// EAS automatically sets EAS_BUILD_PROFILE to the profile name (development,
// preview, production) when running `eas build`. We use it here to vary the
// app name and package so dev and prod builds can be installed side-by-side
// on the same device without conflict.
const IS_DEV = process.env.EAS_BUILD_PROFILE === "development";

export default {
  expo: {
    name: IS_DEV ? "Potluck (Dev)" : "Potluck",
    slug: "potluck-by-savor",
    owner: "calicosquid",
    version: "1.0.3",
    orientation: "portrait",
    icon: "./assets/playstore_2.png",
    userInterfaceStyle: "light",

    // ── OTA Updates ────────────────────────────────────────────────────────
    // runtimeVersion ties updates to the native build they were compiled
    // against. appVersion means a new native build = new update channel.
    // Dev builds are excluded — they use local Metro, not EAS Update.
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/d98f6cca-5c80-42b3-93ae-bc5bce714533",
      enabled: !IS_DEV,
      // App.js owns update checks after a real background absence. Disable the
      // default launch check so startup can never trigger a surprise fetch.
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0,
    },

    ios: {
      supportsTablet: false,
      // Required by Linking.canOpenURL on iOS. Harmless until Potluck ships
      // there, and keeps the Savor-installed check cross-platform.
      infoPlist: {
        LSApplicationQueriesSchemes: ["savor", "savor-dev"],
      },
      bundleIdentifier: IS_DEV
        ? "com.calicosquid.savorpotluck.dev"
        : "com.calicosquid.savorpotluck",
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/playstore_2.png",
        backgroundColor: "#fffefe",
      },
      package: IS_DEV
        ? "com.calicosquid.savorpotluck.dev"
        : "com.calicosquid.savorpotluck",
      // Increment this for every Play Store build submission.
      versionCode: 7,
      // Potluck adds no extra Android permissions here. Dependencies may still
      // contribute normal permissions required for their own runtime behavior.
      permissions: [],
    },

    plugins: [
      "expo-font",
      "expo-updates",
      "./plugins/withAdiRegistration",
      "./plugins/withSavorQueries",
      [
        "expo-splash-screen",
        {
          image: "./assets/potluck-splash.png",
          resizeMode: "contain",
          backgroundColor: "#fffefe",
          imageWidth: 200,
          android: {
            image: "./assets/potluck-splash.png",
            resizeMode: "contain",
            backgroundColor: "#fffefe",
            imageWidth: 200,
          },
          ios: {
            image: "./assets/potluck-splash.png",
            resizeMode: "contain",
            backgroundColor: "#fffefe",
            imageWidth: 200,
          },
        },
      ],
    ],

    extra: {
      eas: {
        projectId: "d98f6cca-5c80-42b3-93ae-bc5bce714533",
      },
    },
  },
};
