/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { initFirebase } from './src/services/firebase';

initFirebase();

// Pushes with a `notification` payload are shown by Android itself while the app is in
// the background; taps are handled in AppNavigator. Nothing extra to do here.
setBackgroundMessageHandler(getMessaging(), async () => {});
notifee.onBackgroundEvent(async () => {});

AppRegistry.registerComponent(appName, () => App);
