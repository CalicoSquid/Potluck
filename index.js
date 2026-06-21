import { registerRootComponent } from 'expo';

// Must run before any component renders — patches Text/TextInput scaling.
import './src/lib/fontScaling';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);