export default {
  expo: {
    name: "Potluck",
    slug: "potluck-by-savor",
    owner: "calicosquid",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/playstore_2.png",
    userInterfaceStyle: "light",

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.calicosquid.savorpotluck",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/playstore_2.png",
        backgroundColor: "#fffefe",
      },
      package: "com.calicosquid.savorpotluck",
    },

    plugins: [
      "expo-font",
      [
        "expo-splash-screen",
        {
          image:           "./assets/potluck-splash.png",
          resizeMode:      "contain",
          backgroundColor: "#fffefe",
          // Android-specific overrides — same image / colour, but explicitly
          // declared so the activity window background is also painted.
          // This is what eliminates the gray flash on Expo 54.
          android: {
            image:           "./assets/potluck-splash.png",
            resizeMode:      "contain",
            backgroundColor: "#fffefe",
          },
          ios: {
            image:           "./assets/potluck-splash.png",
            resizeMode:      "contain",
            backgroundColor: "#fffefe",
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