import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors } from '../theme/theme';

interface PickOptions {
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onPick: (date: Date) => void;
}

/**
 * Cross-platform date picker. Android has an imperative dialog (a mounted <DateTimePicker>
 * would re-open on every re-render); iOS has none, so the returned element renders an inline
 * calendar in a modal. Render `picker` once anywhere in the screen.
 */
export function useDatePicker(): [(options: PickOptions) => void, React.ReactNode] {
  const [ios, setIos] = useState<(PickOptions & { draft: Date }) | null>(null);

  const open = useCallback((options: PickOptions) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: options.value,
        mode: 'date',
        minimumDate: options.minimumDate,
        maximumDate: options.maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) options.onPick(date);
        },
      });
    } else {
      setIos({ ...options, draft: options.value });
    }
  }, []);

  const picker =
    Platform.OS === 'ios' ? (
      <Portal>
        <Modal visible={!!ios} onDismiss={() => setIos(null)} contentContainerStyle={styles.sheet}>
          {ios && (
            <>
              <DateTimePicker
                value={ios.draft}
                mode="date"
                display="inline"
                minimumDate={ios.minimumDate}
                maximumDate={ios.maximumDate}
                accentColor={colors.primary}
                onChange={(_, date) => date && setIos(s => (s ? { ...s, draft: date } : s))}
              />
              <View style={styles.actions}>
                <Button onPress={() => setIos(null)}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    ios.onPick(ios.draft);
                    setIos(null);
                  }}>
                  Done
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    ) : null;

  return [open, picker];
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
});
