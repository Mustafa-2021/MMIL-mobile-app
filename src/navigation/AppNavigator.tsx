import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import StartScreen from '../screens/StartScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminTabNavigator from './AdminTabNavigator';
import MemberTabNavigator from './MemberTabNavigator';
import { RootStackParamList } from '../types';
import {
  displayForegroundPush,
  requestNotificationPermission,
  saveFcmToken,
  setupNotificationChannel,
  syncFcmTokenOnRefresh,
} from '../services/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function AppNavigator() {
  const { initializing, firebaseUser, profile, refreshProfile } = useAuthContext();
  const [navReady, setNavReady] = useState(false);
  // Task to open once the user is signed in and the main screens are mounted.
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setupNotificationChannel();

    const openFrom = (data?: { [key: string]: unknown }) => {
      const taskId = data?.taskId;
      if (typeof taskId === 'string' && taskId) setPendingTaskId(taskId);
    };
    const messaging = getMessaging();

    // Push arrives while the app is open: FCM won't show it, so display it ourselves.
    const unsubMessage = onMessage(messaging, displayForegroundPush);
    // Tapped a push while the app was in the background.
    const unsubOpened = onNotificationOpenedApp(messaging, m => openFrom(m.data));
    // Tapped a push that launched the app from closed.
    getInitialNotification(messaging).then(m => openFrom(m?.data));
    // Tapped a notification we displayed ourselves (foreground push).
    const unsubNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) openFrom(detail.notification?.data);
    });
    notifee.getInitialNotification().then(n => openFrom(n?.notification.data));

    return () => {
      unsubMessage();
      unsubOpened();
      unsubNotifee();
    };
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    requestNotificationPermission().then(granted => {
      if (granted) saveFcmToken(profile.uid);
    });
    return syncFcmTokenOnRefresh(profile.uid);
  }, [profile?.uid]);

  useEffect(() => {
    if (pendingTaskId && navReady && profile?.teamId && navigationRef.isReady()) {
      navigationRef.navigate('TaskDetail', { taskId: pendingTaskId });
      setPendingTaskId(null);
    }
  }, [pendingTaskId, navReady, profile?.teamId]);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: colors.white }}>
        {!firebaseUser ? (
          <>
            <Stack.Screen name="Start" component={StartScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" options={{ headerShown: false }}>
              {() => <OnboardingScreen phase="preAuth" />}
            </Stack.Screen>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          </>
        ) : !profile || !profile.teamId ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => <OnboardingScreen phase="postAuth" onDone={refreshProfile} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              options={{ headerShown: false }}>
              {() => (profile.role === 'admin' ? <AdminTabNavigator /> : <MemberTabNavigator />)}
            </Stack.Screen>
            <Stack.Screen
              name="CreateTask"
              component={CreateTaskScreen}
              options={{ title: 'New Task' }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Task Details' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
