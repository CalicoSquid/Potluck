export default {
  expo: {
    name: "Potluck",
    slug: "potluck-by-savor",
    owner: "calicosquid", 
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/playstore.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/potluck-splash.png",
      resizeMode: "contain",
      backgroundColor: "#fffefe",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.calicosquid.savorpotluck",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/playstore.png",
        backgroundColor: "#fffefe",
      },
      package: "com.calicosquid.savorpotluck",
    },

    plugins: ["expo-font"],

    extra: {
      eas: {
        projectId: "d98f6cca-5c80-42b3-93ae-bc5bce714533",
      },
    },
  },
};
