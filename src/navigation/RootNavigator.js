import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SpinScreen from "../screens/SpinScreen";
import RecipeScreen from "../screens/RecipeScreen";
import DoneScreen from "../screens/DoneScreen";

const Stack = createNativeStackNavigator();

// Match the Expo splash background so the navigation container never
// shows a grey or white flash between the native splash and the first screen.
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#fffefe",
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Spin" component={SpinScreen} />
        <Stack.Screen name="Recipe" component={RecipeScreen} />
        <Stack.Screen name="Done" component={DoneScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}