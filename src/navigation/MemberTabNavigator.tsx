import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/theme';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { MemberTabParamList } from '../types';
import ProfileHeaderButton from '../components/ProfileHeaderButton';

const Tab = createBottomTabNavigator<MemberTabParamList>();

export default function MemberTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerRight: () => <ProfileHeaderButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tab.Screen
        name="MyTasks"
        component={HomeScreen}
        options={{
          title: 'My Tasks',
          tabBarIcon: ({ color, size }) => <Icon name="checkbox-marked-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Icon name="bell-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
