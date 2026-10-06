import { MD3LightTheme } from 'react-native-paper';

export const colors = {
  primary: '#1E3A8A',
  primaryLight: '#3B5BB0',
  background: '#FFFFFF',
  surface: '#F5F7FB',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  high: '#DC2626',
  medium: '#F59E0B',
  low: '#16A34A',
  todo: '#6B7280',
  inProgress: '#2563EB',
  done: '#16A34A',
  overdue: '#DC2626',
  white: '#FFFFFF',
};

// Every Paper typography variant is bumped by FONT_SCALE_STEP for readability.
const FONT_SCALE_STEP = 1;

type Fonts = typeof MD3LightTheme.fonts;

const fonts = Object.fromEntries(
  Object.entries(MD3LightTheme.fonts).map(([key, font]) => {
    const f = font as { fontSize?: number; lineHeight?: number };
    if (key === 'default') {
      // Used by <Text> without a variant; RN's own default is 14.
      return [key, { ...font, fontSize: 14 + FONT_SCALE_STEP }];
    }
    return [
      key,
      {
        ...font,
        ...(f.fontSize ? { fontSize: f.fontSize + FONT_SCALE_STEP } : {}),
        ...(f.lineHeight ? { lineHeight: f.lineHeight + FONT_SCALE_STEP } : {}),
      },
    ];
  }),
) as Fonts;

export const theme = {
  ...MD3LightTheme,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
  },
};
