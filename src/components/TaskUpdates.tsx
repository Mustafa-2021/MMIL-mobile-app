import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/theme';
import { addTaskComment, subscribeTaskComments } from '../services/comments';
import { AppUser, Task, TaskComment } from '../types';
import { formatDateTime } from '../utils/helpers';

export default function TaskUpdates({
  task,
  me,
  onInputFocus,
}: {
  task: Task;
  me: AppUser;
  /** Called with the input's y offset inside this component, so the parent can scroll it into view. */
  onInputFocus?: (inputY: number) => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const inputY = useRef(0);

  useEffect(
    () =>
      subscribeTaskComments(task.id, setComments, err =>
        console.warn('Comments subscription failed:', err),
      ),
    [task.id],
  );

  const handlePost = async () => {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    try {
      await addTaskComment(task, me, text);
      setDraft('');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not post update', text2: e?.message });
    } finally {
      setPosting(false);
    }
  };

  return (
    <View>
      {comments.length === 0 ? (
        <Text style={styles.empty}>No updates yet. Post the first one below.</Text>
      ) : (
        comments.map(c => {
          const mine = c.authorUid === me.uid;
          return (
            <View key={c.id} style={[styles.bubble, mine && styles.bubbleMine]}>
              <View style={styles.bubbleHeader}>
                <Text style={styles.author}>
                  {mine ? 'You' : c.authorName}
                  {c.authorRole === 'admin' ? '  · Admin' : ''}
                </Text>
                <Text style={styles.time}>{formatDateTime(c.createdAt)}</Text>
              </View>
              <Text style={styles.text}>{c.text}</Text>
            </View>
          );
        })
      )}

      <TextInput
        mode="outlined"
        placeholder="Write an update…"
        value={draft}
        onChangeText={setDraft}
        onLayout={e => {
          inputY.current = e.nativeEvent.layout.y;
        }}
        onFocus={() => onInputFocus?.(inputY.current)}
        multiline
        maxLength={1000}
        style={styles.input}
      />
      <Button
        mode="contained"
        icon="send"
        onPress={handlePost}
        loading={posting}
        disabled={posting || !draft.trim()}
        style={styles.postButton}>
        Post Update
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.textMuted,
    marginBottom: 8,
  },
  bubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  bubbleMine: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryLight,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  author: {
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1,
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
  },
  text: {
    color: colors.text,
  },
  input: {
    marginTop: 4,
    maxHeight: 140,
  },
  postButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    borderRadius: 10,
  },
});
