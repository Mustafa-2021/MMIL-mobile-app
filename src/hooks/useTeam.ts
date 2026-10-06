import { useEffect, useState } from 'react';
import { AppUser, Team } from '../types';
import { getTeam, subscribeTeamMembers } from '../services/team';

export function useTeamMembers(teamId: string | null) {
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeTeamMembers(teamId, list => {
      setMembers(list);
      setLoading(false);
    });
    return unsubscribe;
  }, [teamId]);

  return { members, loading };
}

export function useTeam(teamId: string | null) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!teamId) {
      setTeam(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getTeam(teamId).then(t => {
      if (active) {
        setTeam(t);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [teamId]);

  return { team, loading };
}
