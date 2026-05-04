// EAS automatically sets EAS_BUILD_PROFILE to the profile name (development,
// preview, production) when running `eas build`. We use it here to vary the
// app name and package so dev and prod builds can be installed side-by-side
// on the same device without conflict.
const IS_DEV = process.env.EAS_BUILD_PROFILE === "development";

export default {
  expo: {
    name:               IS_DEV ? "Potluck (Dev)" : "Potluck",
    slug:               "potluck-by-savor",
    owner:              "calicosquid",
    version:            "1.0.0",
    orientation:        "portrait",
    icon:               "./assets/playstore_2.png",
    userInterfaceStyle: "light",

    ios: {
      supportsTablet:   false,
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
    },

    plugins: [
      "expo-font",
      [
        "expo-splash-screen",
        {
          image:           "./assets/potluck-splash.png",
          resizeMode:      "contain",
          backgroundColor: "#fffefe",
          imageWidth:      200,
          android: {
            image:           "./assets/potluck-splash.png",
            resizeMode:      "contain",
            backgroundColor: "#fffefe",
            imageWidth:      200,
          },
          ios: {
            image:           "./assets/potluck-splash.png",
            resizeMode:      "contain",
            backgroundColor: "#fffefe",
            imageWidth:      200,
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