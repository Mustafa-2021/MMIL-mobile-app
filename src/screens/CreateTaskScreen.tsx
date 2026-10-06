import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Menu, Text, TextInput } from 'react-native-paper';
import { useDatePicker } from '../components/DatePicker';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeamMembers } from '../hooks/useTeam';
import { createTask, updateTask } from '../services/tasks';
import {
  ATTACHMENT_RETENTION_DAYS,
  PickedFile,
  pickAttachment,
  uploadAttachment,
} from '../services/attachments';
import AttachmentCard from '../components/AttachmentCard';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { RootStackParamList, TaskCategory, TaskPriority } from '../types';
import { formatDate } from '../utils/helpers';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];
const CATEGORIES: TaskCategory[] = [
  'Quotation',
  'PO Follow-up',
  'Vendor Visit',
  'Payment Follow-up',
  'Other',
];

export default function CreateTaskScreen() {
  const [openDatePicker, datePicker] = useDatePicker();
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthContext();
  const { members } = useTeamMembers(profile?.teamId ?? null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeUid, setAssigneeUid] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [category, setCategory] = useState<TaskCategory>('Other');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const keyboardHeight = useKeyboardHeight();
  const [attachment, setAttachment] = useState<PickedFile | null>(null);
  const [picking, setPicking] = useState(false);

  const assignee = members.find(m => m.uid === assigneeUid);

  const handlePickAttachment = async () => {
    setPicking(true);
    try {
      const file = await pickAttachment();
      if (file) setAttachment(file);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Cannot attach this file', text2: e?.message });
    } finally {
      setPicking(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Task title is required' });
      return;
    }
    if (!assigneeUid || !assignee) {
      Toast.show({ type: 'error', text1: 'Please select who to assign this task to' });
      return;
    }
    if (!profile) return;

    setSaving(true);
    try {
      const taskId = await createTask({
        title: title.trim(),
        description: description.trim(),
        assigneeUid,
        assigneeName: assignee.name,
        createdBy: profile.uid,
        teamId: profile.teamId!,
        priority,
        category,
        status: 'To Do',
        dueDate: dueDate.getTime(),
      });
      if (attachment) {
        try {
          const uploaded = await uploadAttachment(taskId, attachment);
          await updateTask(taskId, { attachment: uploaded });
        } catch (e: any) {
          Toast.show({
            type: 'error',
            text1: 'Task created, but attachment upload failed',
            text2: e?.message,
          });
          navigation.goBack();
          return;
        }
      }
      Toast.show({ type: 'success', text1: 'Task created successfully' });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not create task', text2: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + keyboardHeight }]}
      keyboardShouldPersistTaps="handled">
      <TextInput
        mode="outlined"
        label="Title *"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <Text style={styles.label}>Assign To *</Text>
      <Menu
        visible={assigneeMenu}
        onDismiss={() => setAssigneeMenu(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setAssigneeMenu(true)}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}>
            {assignee ? assignee.name : 'Select team member'}
          </Button>
        }>
        {members.length === 0 && <Menu.Item title="No team members yet" disabled />}
        {members.map(m => (
          <Menu.Item
            key={m.uid}
            onPress={() => { setAssigneeUid(m.uid); setAssigneeMenu(false); }}
            title={m.name}
          />
        ))}
      </Menu>

      <Text style={styles.label}>Priority</Text>
      <View style={styles.chipRow}>
        {PRIORITIES.map(p => (
          <Chip
            key={p}
            selected={priority === p}
            onPress={() => setPriority(p)}
            style={styles.chip}>
            {p}
          </Chip>
        ))}
      </View>

      <Text style={styles.label}>Category</Text>
      <Menu
        visible={categoryMenu}
        onDismiss={() => setCategoryMenu(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setCategoryMenu(true)}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}>
            {category}
          </Button>
        }>
        {CATEGORIES.map(c => (
          <Menu.Item key={c} onPress={() => { setCategory(c); setCategoryMenu(false); }} title={c} />
        ))}
      </Menu>

      <Text style={styles.label}>Due Date</Text>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={() =>
          openDatePicker({ value: dueDate, minimumDate: new Date(), onPick: setDueDate })
        }
        style={styles.selectButton}
        contentStyle={styles.selectButtonContent}>
        {formatDate(dueDate.getTime())}
      </Button>

      <Text style={styles.label}>Attachment (optional)</Text>
      {attachment ? (
        <AttachmentCard
          name={attachment.name}
          size={attachment.size}
          mimeType={attachment.mimeType}
          caption={`Kept for ${ATTACHMENT_RETENTION_DAYS} days after upload`}
          onRemove={saving ? undefined : () => setAttachment(null)}
        />
      ) : (
        <Button
          mode="outlined"
          icon="paperclip"
          onPress={handlePickAttachment}
          loading={picking}
          disabled={picking || saving}
          style={styles.selectButton}
          contentStyle={styles.selectButtonContent}>
          Add attachment (PDF, Excel, Word… max 10 MB)
        </Button>
      )}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}>
        Save Task
      </Button>
      {datePicker}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  selectButton: {
    marginBottom: 16,
    justifyContent: 'flex-start',
  },
  selectButtonContent: {
    height: 52,
    justifyContent: 'flex-start',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: colors.surface,
  },
  saveButton: {
    marginTop: 12,
    borderRadius: 10,
  },
  saveButtonContent: {
    height: 52,
  },
});
