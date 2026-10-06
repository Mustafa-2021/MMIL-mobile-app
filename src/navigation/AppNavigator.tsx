import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import {
  createNavigationContainerRef,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HubScreen from '../screens/HubScreen';
import TeamPickerScreen from '../screens/TeamPickerScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SuperAdminScreen from '../screens/admin/SuperAdminScreen';
import ImportEmployeesScreen from '../screens/admin/ImportEmployeesScreen';
import EmployeesScreen from '../screens/admin/EmployeesScreen';
import EmployeeDetailScreen from '../screens/admin/EmployeeDetailScreen';
import EmployeeFormScreen from '../screens/admin/EmployeeFormScreen';
import TeamsScreen from '../screens/admin/TeamsScreen';
import ActivityLogScreen from '../screens/admin/ActivityLogScreen';
import ProfileHeaderButton from '../components/ProfileHeaderButton';
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
import { getTask } from '../services/tasks';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function AppNavigator() {
  const { initializing, firebaseUser, profile, setActiveTeamId } = useAuthContext();
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

  // Opening a task from a notification: switch to the task's team first, since the task
  // screens act on the open team.
  const hasTeams = (profile?.teamIds.length ?? 0) > 0;
  useEffect(() => {
    if (!pendingTaskId || !navReady || !hasTeams || !navigationRef.isReady()) return;
    const taskId = pendingTaskId;
    setPendingTaskId(null);
    getTask(taskId)
      .then(task => {
        if (!task) return;
        setActiveTeamId(task.teamId);
        navigationRef.navigate('TaskDetail', { taskId });
      })
      .catch(() => {});
  }, [pendingTaskId, navReady, hasTeams, setActiveTeamId]);

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
        {!firebaseUser || !profile ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen
              name="Hub"
              component={HubScreen}
              options={{ title: 'MMIL', headerRight: () => <ProfileHeaderButton /> }}
            />
            <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
            {hasTeams && (
              <>
                <Stack.Screen
                  name="TeamPicker"
                  component={TeamPickerScreen}
                  options={{ title: 'Team' }}
                />
                <Stack.Screen name="Main" options={{ headerShown: false }}>
                  {() =>
                    !profile.teamId ? (
                      <BackToHub />
                    ) : profile.role === 'admin' ? (
                      <AdminTabNavigator />
                    ) : (
                      <MemberTabNavigator />
                    )
                  }
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
              </>
            )}
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
            {profile.superAdmin && (
              <>
                <Stack.Screen
                  name="SuperAdmin"
                  component={SuperAdminScreen}
                  options={{ title: 'Super Admin' }}
                />
                <Stack.Screen
                  name="ImportEmployees"
                  component={ImportEmployeesScreen}
                  options={{ title: 'Import HR Sheet' }}
                />
                <Stack.Screen
                  name="Employees"
                  component={EmployeesScreen}
                  options={{ title: 'Employees' }}
                />
                <Stack.Screen
                  name="EmployeeDetail"
                  component={EmployeeDetailScreen}
                  options={{ title: 'Employee' }}
                />
                <Stack.Screen
                  name="EmployeeForm"
                  component={EmployeeFormScreen}
                  options={{ title: 'Employee' }}
                />
                <Stack.Screen name="Teams" component={TeamsScreen} options={{ title: 'Teams' }} />
                <Stack.Screen
                  name="ActivityLog"
                  component={ActivityLogScreen}
                  options={{ title: 'Activity Log' }}
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/** Main without an open team (e.g. just removed from it): go back to Home. */
function BackToHub() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(() => {
    navigation.navigate('Hub');
  }, [navigation]);
  return null;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
