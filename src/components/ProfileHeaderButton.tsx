import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/theme';
import { RootStackParamList } from '../types';

export default function ProfileHeaderButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('Profile')}
      hitSlop={8}
      accessibilityLabel="Profile">
      <Icon name="account-circle-outline" size={28} color={colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 16,
  },
});
