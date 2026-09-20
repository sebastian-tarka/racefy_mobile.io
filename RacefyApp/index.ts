import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
// CRITICAL: Register background location task BEFORE any React components mount
// This must happen at the earliest point in the app lifecycle for native builds
import './src/services/backgroundLocation';
// Same rule for the task that delivers activities saved offline: it has to be
// defined at module scope on every JS start, including a headless one.
import './src/services/finishSyncBackgroundTask';

import App from './App';

// Keep the native splash visible until the animated splash overlay takes over,
// so there is no flash of an empty screen on cold start.
SplashScreen.preventAutoHideAsync().catch(() => {});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
