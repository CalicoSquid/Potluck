import React from "react";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { ApolloProvider } from "@apollo/client";
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SafeAreaProvider } from "react-native-safe-area-context";

import client from "./src/apollo/client";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/constants/colors";

export default function App() {
  const [fontsLoaded] = useFonts({
    Raleway:         require("./assets/fonts/Raleway-Regular.ttf"),
    RalewayBold:     require("./assets/fonts/Raleway-Bold.ttf"),
    RalewaySemiBold: require("./assets/fonts/Raleway-SemiBold.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.gradientStart }}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ApolloProvider client={client}>
          <RootNavigator />
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}