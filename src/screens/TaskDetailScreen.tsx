import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Menu,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useDatePicker } from '../components/DatePicker';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuthContext } from '../hooks/AuthContext';
import { useTeamMembers } from '../hooks/useTeam';
import {
  deleteTask,
  getTask,
  requestExtension,
  updateTask,
} from '../services/tasks';
import { notifyUser } from '../services/notifications';
import { RootStackParamList, Task, TaskPriority, TaskStatus } from '../types';
import { formatDate, isOverdue } from '../utils/helpers';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import ExtensionHistoryList from '../components/ExtensionHistoryList';
import TaskUpdates from '../components/TaskUpdates';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import AttachmentCard from '../components/AttachmentCard';
import {
  attachmentExpiresAt,
  deleteAttachment,
  isAttachmentExpired,
  openAttachment,
  pickAttachment,
  uploadAttachment,
} from '../services/attachments';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type TaskRoute = RouteProp<RootStackParamList, 'TaskDetail'>;

const STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Done'];
const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

export default function TaskDetailScreen() {
  const [openPicker, datePicker] = useDatePicker();
  const navigation = useNavigation<Nav>();
  const route = useRoute<TaskRoute>();
  const { taskId } = route.params;
  const { profile } = useAuthContext();
  const { members } = useTeamMembers(profile?.teamId ?? null);

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMenu, setStatusMenu] = useState(false);
  const [priorityMenu, setPriorityMenu] = useState(false);
  const [assigneeMenu, setAssigneeMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExtensionPicker, setShowExtensionPicker] = useState(false);
  const [extensionDate, setExtensionDate] = useState<Date>(new Date());
  const [busy, setBusy] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);

  // Keep the "Write an update" box visible above the keyboard (see useKeyboardHeight).
  const scrollRef = useRef<ScrollViewInstance>(null);
  const updatesY = useRef(0);
  const pendingScrollY = useRef<number | null>(null);
  const keyboardHeight = useKeyboardHeight();

  const scrollToUpdateInput = (inputY: number) => {
    // Leave room above the input so the latest updates stay in view.
    const y = Math.max(0, updatesY.current + inputY - 160);
    if (keyboardHeight > 0) {
      scrollRef.current?.scrollTo({ y, animated: true });
    } else {
      // Keyboard is still opening; scroll once the bottom padding exists.
      pendingScrollY.current = y;
    }
  };

  useEffect(() => {
    if (keyboardHeight > 0 && pendingScrollY.current != null) {
      const y = pendingScrollY.current;
      pendingScrollY.current = null;
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: true }));
    }
  }, [keyboardHeight]);

  const isAdmin = profile?.role === 'admin';
  const isMine = task?.assigneeUid === profile?.uid;

  const load = async () => {
    setLoading(true);
    const t = await getTask(taskId);
    setTask(t);
    if (t) {
      setTitleDraft(t.title);
      setDescDraft(t.description);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const refreshAndSet = async (updates: Partial<Task>) => {
    if (!task) return;
    setBusy(true);
    try {
      await updateTask(task.id, updates);
      setTask({ ...task, ...updates });
      Toast.show({ type: 'success', text1: 'Task updated' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    setStatusMenu(false);
    await refreshAndSet({ status });
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    setPriorityMenu(false);
    await refreshAndSet({ priority });
  };

  const handleReassign = async (uid: string) => {
    setAssigneeMenu(false);
    const member = members.find(m => m.uid === uid);
    if (!member || !task) return;
    await refreshAndSet({ assigneeUid: uid, assigneeName: member.name });
    await notifyUser({
      teamId: task.teamId,
      userId: uid,
      title: 'Task reassigned to you',
      body: `You were assigned: ${task.title}`,
      type: 'assigned',
      taskId: task.id,
    });
  };

  const handleTitleSave = async () => {
    if (!titleDraft.trim()) {
      Toast.show({ type: 'error', text1: 'Title cannot be empty' });
      return;
    }
    setEditingTitle(false);
    await refreshAndSet({ title: titleDraft.trim() });
  };

  const handleDescriptionSave = async () => {
    setEditingDescription(false);
    await refreshAndSet({ description: descDraft.trim() });
  };

  const handleDueDateChange = async (date: Date) => {
    await refreshAndSet({ dueDate: date.getTime() });
  };

  const openDatePicker = (value: Date, onPick: (date: Date) => void, minimumDate?: Date) =>
    openPicker({ value, minimumDate, onPick });

  const handleOpenAttachment = async () => {
    if (!task?.attachment) return;
    setAttachmentBusy(true);
    try {
      await openAttachment(task.attachment);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not open attachment', text2: e?.message });
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleAddAttachment = async () => {
    if (!task) return;
    setAttachmentBusy(true);
    try {
      const file = await pickAttachment();
      if (file) {
        const uploaded = await uploadAttachment(task.id, file);
        await refreshAndSet({ attachment: uploaded });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Cannot attach this file', text2: e?.message });
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleRemoveAttachment = () => {
    const att = task?.attachment;
    if (!att) return;
    Alert.alert('Remove attachment', `Remove "${att.name}" from this task?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setAttachmentBusy(true);
          try {
            await deleteAttachment(att);
            await refreshAndSet({ attachment: null });
          } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Could not remove attachment', text2: e?.message });
          } finally {
            setAttachmentBusy(false);
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    if (!task) return;
    setBusy(true);
    try {
      await deleteTask(task.id);
      Toast.show({ type: 'success', text1: 'Task deleted' });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Delete failed', text2: e?.message });
    } finally {
      setBusy(false);
      setShowDeleteDialog(false);
    }
  };

  const handleRequestExtension = async () => {
    if (!task) return;
    setBusy(true);
    try {
      await requestExtension(task, extensionDate.getTime());
      await load();
      Toast.show({ type: 'success', text1: 'Extension requested' });
      if (task.createdBy) {
        await notifyUser({
          teamId: task.teamId,
          userId: task.createdBy,
          title: 'Due date extension requested',
          body: `${task.assigneeName} requested a new due date for "${task.title}"`,
          type: 'extension',
          taskId: task.id,
        });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not request extension', text2: e?.message });
    } finally {
      setBusy(false);
      setShowExtensionPicker(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text>Task not found.</Text>
      </View>
    );
  }

  const overdue = isOverdue(task.dueDate, task.status);
  const assignee = members.find(m => m.uid === task.assigneeUid);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 48 + keyboardHeight }]}
      keyboardShouldPersistTaps="handled">
      {editingTitle && isAdmin ? (
        <View style={styles.editRow}>
          <TextInput
            mode="outlined"
            value={titleDraft}
            onChangeText={setTitleDraft}
            style={styles.editInput}
          />
          <Button onPress={handleTitleSave}>Save</Button>
        </View>
      ) : (
        <View style={styles.titleRow}>
          <Text variant="headlineSmall" style={styles.title}>
            {task.title}
          </Text>
          {isAdmin && (
            <Button compact onPress={() => setEditingTitle(true)}>
              Edit
            </Button>
          )}
        </View>
      )}

      <View style={styles.badgeRow}>
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} overdue={overdue} />
      </View>

      <Text style={styles.sectionLabel}>Description</Text>
      {editingDescription && isAdmin ? (
        <View style={styles.editRow}>
          <TextInput
            mode="outlined"
            value={descDraft}
            onChangeText={setDescDraft}
            multiline
            style={styles.editInput}
          />
          <Button onPress={handleDescriptionSave}>Save</Button>
        </View>
      ) : (
        <View style={styles.editRow}>
          <Text style={styles.description}>
            {task.description || 'No description provided.'}
          </Text>
          {isAdmin && (
            <Button compact onPress={() => setEditingDescription(true)}>
              Edit
            </Button>
          )}
        </View>
      )}

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Assignee</Text>
          <Text style={styles.infoValue}>{assignee?.name ?? task.assigneeName}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Category</Text>
          <Text style={styles.infoValue}>{task.category}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Due Date</Text>
          <Text style={[styles.infoValue, overdue && { color: colors.overdue }]}>
            {formatDate(task.dueDate)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValue}>{formatDate(task.createdAt)}</Text>
        </View>
      </View>

      {isAdmin && (
        <>
          <Text style={styles.sectionLabel}>Reassign</Text>
          <Menu
            visible={assigneeMenu}
            onDismiss={() => setAssigneeMenu(false)}
            anchor={
              <Button mode="outlined" onPress={() => setAssigneeMenu(true)} style={styles.actionButton}>
                {assignee?.name ?? task.assigneeName}
              </Button>
            }>
            {members.map(m => (
              <Menu.Item key={m.uid} onPress={() => handleReassign(m.uid)} title={m.name} />
            ))}
          </Menu>

          <Text style={styles.sectionLabel}>Priority</Text>
          <Menu
            visible={priorityMenu}
            onDismiss={() => setPriorityMenu(false)}
            anchor={
              <Button mode="outlined" onPress={() => setPriorityMenu(true)} style={styles.actionButton}>
                {task.priority}
              </Button>
            }>
            {PRIORITIES.map(p => (
              <Menu.Item key={p} onPress={() => handlePriorityChange(p)} title={p} />
            ))}
          </Menu>

          <Text style={styles.sectionLabel}>Due Date</Text>
          <Button
            mode="outlined"
            icon="calendar"
            style={styles.actionButton}
            onPress={() => openDatePicker(new Date(task.dueDate), handleDueDateChange)}>
            {formatDate(task.dueDate)}
          </Button>
        </>
      )}

      <Text style={styles.sectionLabel}>Status</Text>
      <Menu
        visible={statusMenu}
        onDismiss={() => setStatusMenu(false)}
        anchor={
          <Button mode="outlined" onPress={() => setStatusMenu(true)} style={styles.actionButton}>
            {task.status}
          </Button>
        }>
        {STATUSES.map(s => (
          <Menu.Item key={s} onPress={() => handleStatusChange(s)} title={s} />
        ))}
      </Menu>

      {!isAdmin && isMine && (
        <>
          <Button
            mode="contained"
            icon="calendar-clock"
            style={styles.extensionButton}
            contentStyle={styles.actionButtonContent}
            onPress={() =>
              openDatePicker(
                new Date(Math.max(task.dueDate, Date.now())),
                date => {
                  setExtensionDate(date);
                  setShowExtensionPicker(true);
                },
                new Date(),
              )
            }>
            Request Extension
          </Button>
          {showExtensionPicker && (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                New due date: {formatDate(extensionDate.getTime())}
              </Text>
              <View style={styles.confirmRow}>
                <Button
                  mode="text"
                  disabled={busy}
                  onPress={() => setShowExtensionPicker(false)}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleRequestExtension} loading={busy} disabled={busy}>
                  Confirm
                </Button>
              </View>
            </View>
          )}
        </>
      )}

      {(isAdmin || isMine) && (task.attachment || isAdmin) && (
        <>
          <Text style={styles.sectionLabel}>Attachment</Text>
          {task.attachment ? (
            <AttachmentCard
              name={task.attachment.name}
              size={task.attachment.size}
              mimeType={task.attachment.mimeType}
              caption={
                isAttachmentExpired(task.attachment)
                  ? 'Expired: file has been removed'
                  : `Available until ${formatDate(attachmentExpiresAt(task.attachment))}`
              }
              captionIsError={isAttachmentExpired(task.attachment)}
              onPress={isAttachmentExpired(task.attachment) ? undefined : handleOpenAttachment}
              onRemove={isAdmin ? handleRemoveAttachment : undefined}
              busy={attachmentBusy}
            />
          ) : (
            <Button
              mode="outlined"
              icon="paperclip"
              onPress={handleAddAttachment}
              loading={attachmentBusy}
              disabled={attachmentBusy}
              style={styles.actionButton}>
              Add attachment (max 10 MB)
            </Button>
          )}
        </>
      )}

      {profile && (isAdmin || isMine) && (
        <>
          <Text style={styles.sectionLabel}>Updates & Comments</Text>
          <View onLayout={e => (updatesY.current = e.nativeEvent.layout.y)}>
            <TaskUpdates task={task} me={profile} onInputFocus={scrollToUpdateInput} />
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>Extension History</Text>
      <ExtensionHistoryList history={task.extensionHistory} />

      {isAdmin && (
        <Button
          mode="outlined"
          icon="delete"
          textColor={colors.overdue}
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => setShowDeleteDialog(true)}>
          Delete Task
        </Button>
      )}

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete this task?</Dialog.Title>
          <Dialog.Content>
            <Text>This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={handleDelete} loading={busy} textColor={colors.overdue}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      {datePicker}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontWeight: '800',
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  sectionLabel: {
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    flex: 1,
    color: colors.textMuted,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 16,
  },
  infoItem: {
    width: '45%',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  actionButton: {
    marginBottom: 4,
    justifyContent: 'flex-start',
  },
  actionButtonContent: {
    height: 48,
  },
  extensionButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  confirmBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  confirmText: {
    fontWeight: '600',
    color: colors.text,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  deleteButton: {
    marginTop: 24,
    borderColor: colors.overdue,
  },
});
