import { registerRootComponent } from 'expo';
import { Text, TextInput } from 'react-native';

import App from './App';

// Disable OS-level font scaling globally.
// Without this, users with large accessibility font sizes break fixed-height
// layouts (slot reels, header, messaging block). Set once here rather than
// on every <Text> individually.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);