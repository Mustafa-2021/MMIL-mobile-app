import { useEffect, useState } from 'react';
import { Task } from '../types';
import { subscribeMyTasks, subscribeTeamTasks } from '../services/tasks';

export function useMyTasks(teamId: string | null, uid: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !uid) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeMyTasks(
      teamId,
      uid,
      list => {
        setTasks(list.sort((a, b) => a.dueDate - b.dueDate));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [teamId, uid]);

  return { tasks, loading };
}

export function useTeamTasks(teamId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeTeamTasks(
      teamId,
      list => {
        setTasks(list.sort((a, b) => a.dueDate - b.dueDate));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [teamId]);

  return { tasks, loading };
}
