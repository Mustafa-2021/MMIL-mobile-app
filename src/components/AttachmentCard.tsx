import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/theme';
import { formatBytes } from '../services/attachments';

function iconFor(name: string, mimeType: string): { icon: string; color: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType === 'application/pdf' || ext === 'pdf') return { icon: 'file-pdf-box', color: '#DC2626' };
  if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType.includes('sheet') || mimeType.includes('excel'))
    return { icon: 'file-excel-box', color: '#16A34A' };
  if (['doc', 'docx'].includes(ext) || mimeType.includes('word')) return { icon: 'file-word-box', color: '#2563EB' };
  if (['ppt', 'pptx'].includes(ext) || mimeType.includes('presentation'))
    return { icon: 'file-powerpoint-box', color: '#EA580C' };
  if (mimeType.startsWith('image/')) return { icon: 'file-image', color: '#7C3AED' };
  return { icon: 'file-document-outline', color: colors.textMuted };
}

interface Props {
  name: string;
  size: number;
  mimeType: string;
  /** Secondary line, e.g. "Available until 12 Nov 2026" or "Expired". */
  caption?: string;
  captionIsError?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  busy?: boolean;
}

export default function AttachmentCard({
  name,
  size,
  mimeType,
  caption,
  captionIsError,
  onPress,
  onRemove,
  busy,
}: Props) {
  const { icon, color } = iconFor(name, mimeType);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress || busy}
      activeOpacity={0.7}>
      <Icon name={icon} size={36} color={color} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.meta}>
          {formatBytes(size)}
          {onPress ? '  ·  Tap to open' : ''}
        </Text>
        {caption ? (
          <Text style={[styles.meta, captionIsError && styles.error]}>{caption}</Text>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} style={styles.trailing} />
      ) : onRemove ? (
        <IconButton icon="close" size={20} onPress={onRemove} accessibilityLabel="Remove attachment" />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 4,
    marginBottom: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    color: colors.overdue,
  },
  trailing: {
    marginHorizontal: 12,
  },
});
