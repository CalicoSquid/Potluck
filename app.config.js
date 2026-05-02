export default {
  expo: {
    name: "Tonight by Savor",
    slug: "savor-tonight",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/savor-tonight.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/savor-tonight.png",
      resizeMode: "contain",
      backgroundColor: "#fffefe",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.calicosquid.savortonight",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/savor-tonight.png",
        backgroundColor: "#fffefe",
      },
      package: "com.calicosquid.savortonight",
    },

    plugins: ["expo-font"],

    extra: {
      eas: {
        projectId: "f10e041e-6864-4c14-99ae-b189856d94fb",
      },
    },
  },
};