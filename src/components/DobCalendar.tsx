import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Menu, Modal, Portal, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/theme';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FIRST_YEAR = 1940;

interface Props {
  visible: boolean;
  /** Currently selected date as YYYY-MM-DD, or null. */
  value: string | null;
  onDismiss: () => void;
  onSelect: (iso: string) => void;
}

/**
 * Date-of-birth calendar with month and year dropdowns, drawn in JS so it looks the same on
 * Android and iOS. Future dates can't be picked.
 */
export default function DobCalendar({ visible, value, onDismiss, onSelect }: Props) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const initial = value ? value.split('-').map(Number) : [1990, 1, 1];
  const [year, setYear] = useState(initial[0]);
  const [month, setMonth] = useState(initial[1] - 1);
  const [monthMenu, setMonthMenu] = useState(false);
  const [yearMenu, setYearMenu] = useState(false);

  // Reopen on the selected date each time the calendar is shown.
  const [lastVisible, setLastVisible] = useState(visible);
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible && value) {
      const [y, m] = value.split('-').map(Number);
      setYear(y);
      setMonth(m - 1);
    }
  }

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = thisYear; y >= FIRST_YEAR; y--) list.push(y);
    return list;
  }, [thisYear]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array<number | null>(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  }, [year, month]);

  const isFuture = (day: number) => new Date(year, month, day) > today;
  const selectedDay = (() => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return y === year && m - 1 === month ? d : null;
  })();

  const pick = (day: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(iso);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    if (d.getFullYear() < FIRST_YEAR || d > today) return;
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.sheet}>
        <Text style={styles.heading}>Select date of birth</Text>

        <View style={styles.selectors}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8} accessibilityLabel="Previous month">
            <Icon name="chevron-left" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Menu
            visible={monthMenu}
            onDismiss={() => setMonthMenu(false)}
            anchor={
              <Dropdown label={MONTHS[month]} onPress={() => setMonthMenu(true)} wide />
            }>
            <ScrollView style={styles.menuScroll}>
              {MONTHS.map((name, i) => (
                <Menu.Item
                  key={name}
                  title={name}
                  disabled={year === thisYear && i > today.getMonth()}
                  onPress={() => {
                    setMonth(i);
                    setMonthMenu(false);
                  }}
                />
              ))}
            </ScrollView>
          </Menu>
          <Menu
            visible={yearMenu}
            onDismiss={() => setYearMenu(false)}
            anchor={<Dropdown label={String(year)} onPress={() => setYearMenu(true)} />}>
            <ScrollView style={styles.menuScroll}>
              {years.map(y => (
                <Menu.Item
                  key={y}
                  title={String(y)}
                  onPress={() => {
                    setYear(y);
                    if (y === thisYear && month > today.getMonth()) setMonth(today.getMonth());
                    setYearMenu(false);
                  }}
                />
              ))}
            </ScrollView>
          </Menu>
          <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8} accessibilityLabel="Next month">
            <Icon name="chevron-right" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {WEEKDAYS.map((w, i) => (
            <Text key={`w${i}`} style={[styles.cell, styles.weekday]}>
              {w}
            </Text>
          ))}
          {cells.map((day, i) =>
            day == null ? (
              <View key={`e${i}`} style={styles.cell} />
            ) : (
              <TouchableOpacity
                key={day}
                style={styles.cell}
                disabled={isFuture(day)}
                onPress={() => pick(day)}>
                <View style={[styles.day, day === selectedDay && styles.daySelected]}>
                  <Text
                    style={[
                      styles.dayText,
                      day === selectedDay && styles.dayTextSelected,
                      isFuture(day) && styles.dayDisabled,
                    ]}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            ),
          )}
        </View>

        <Button onPress={onDismiss} style={styles.cancel}>
          Cancel
        </Button>
      </Modal>
    </Portal>
  );
}

function Dropdown({ label, onPress, wide }: { label: string; onPress: () => void; wide?: boolean }) {
  return (
    <TouchableOpacity style={[styles.dropdown, wide && styles.dropdownWide]} onPress={onPress}>
      <Text style={styles.dropdownText}>{label}</Text>
      <Icon name="menu-down" size={22} color={colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  selectors: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 6,
    minWidth: 84,
  },
  dropdownWide: {
    minWidth: 130,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  menuScroll: {
    maxHeight: 300,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  weekday: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontSize: 15,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  dayDisabled: {
    color: colors.border,
  },
  cancel: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
