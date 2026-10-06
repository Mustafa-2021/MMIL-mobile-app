import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeam } from '../hooks/useTeam';
import { RootStackParamList } from '../types';

/** Header button in the Team section's tabs: back to the app's Home (sections). */
export function HomeHeaderButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity
      style={styles.homeButton}
      onPress={() => navigation.navigate('Hub')}
      hitSlop={8}
      accessibilityLabel="Home">
      <Icon name="home-outline" size={26} color={colors.white} />
    </TouchableOpacity>
  );
}

/** Tab header title; adds the open team's name when the employee is in more than one team. */
export function TeamHeaderTitle({ title }: { title: string }) {
  const { profile } = useAuthContext();
  const multiTeam = (profile?.teamIds.length ?? 0) > 1;
  const { team } = useTeam(multiTeam ? profile?.teamId ?? null : null);
  return (
    <View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {multiTeam && team && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {team.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  homeButton: {
    marginLeft: 16,
    marginRight: 8,
  },
  title: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.white,
    opacity: 0.8,
    fontSize: 13,
  },
});
