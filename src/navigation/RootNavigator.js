import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SpinScreen from "../screens/SpinScreen";
import RecipeScreen from "../screens/RecipeScreen";
import DoneScreen from "../screens/DoneScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Spin" component={SpinScreen} />
        <Stack.Screen name="Recipe" component={RecipeScreen} />
        <Stack.Screen name="Done" component={DoneScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}