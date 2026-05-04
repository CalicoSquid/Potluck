import React, { useState, useCallback } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApolloProvider } from "@apollo/client/react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import client from "./src/apollo/client";
import RootNavigator from "./src/navigation/RootNavigator";
import SplashTransition from "./src/components/SplashTransition";

// Keep the native splash up until we explicitly hide it.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Raleway:         require("./assets/fonts/Raleway-Regular.ttf"),
    RalewayBold:     require("./assets/fonts/Raleway-Bold.ttf"),
    RalewaySemiBold: require("./assets/fonts/Raleway-SemiBold.ttf"),
  });

  const fontsReady = fontsLoaded || !!fontError;

  // Called by SplashTransition on its first onLayout — hides the native splash
  // the moment the JS white background is painted, eliminating the gray gap.
  const handleSplashReady = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {
      // already hidden
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#fffefe" }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fffefe" }}>

        {/* Mount immediately so the white bg kills the gray gap.
            The animation inside waits for fontsReady before starting. */}
        {!splashDone && (
          <SplashTransition
            onReadyToPaint={handleSplashReady}
            onDone={() => setSplashDone(true)}
            fontsReady={fontsReady}
          />
        )}

        {splashDone && (
          <SafeAreaProvider>
            <ApolloProvider client={client}>
              <RootNavigator />
            </ApolloProvider>
          </SafeAreaProvider>
        )}

      </GestureHandlerRootView>
    </View>
  );
}