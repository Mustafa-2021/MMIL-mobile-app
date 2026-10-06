import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/theme';
import HomeScreen from '../screens/HomeScreen';
import MyTeamScreen from '../screens/MyTeamScreen';
import ReportsScreen from '../screens/ReportsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { AdminTabParamList } from '../types';
import ProfileHeaderButton from '../components/ProfileHeaderButton';
import { HomeHeaderButton, TeamHeaderTitle } from '../components/TeamHeader';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerLeft: () => <HomeHeaderButton />,
        headerTitle: ({ children }) => <TeamHeaderTitle title={children} />,
        headerRight: () => <ProfileHeaderButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tab.Screen
        name="AllTasks"
        component={HomeScreen}
        options={{
          title: 'All Tasks',
          tabBarIcon: ({ color, size }) => <Icon name="format-list-checks" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MyTeamTab"
        component={MyTeamScreen}
        options={{
          title: 'My Team',
          tabBarIcon: ({ color, size }) => <Icon name="account-group-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <Icon name="file-chart-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Icon name="bell-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
