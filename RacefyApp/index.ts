import { registerRootComponent } from 'expo';

// CRITICAL: Register background location task BEFORE any React components mount
// This must happen at the earliest point in the app lifecycle for native builds
import './src/services/backgroundLocation';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
