import { useEffect, useMemo, useState } from 'react';
import { AppUser, Team } from '../types';
import { getTeam, subscribeAllTeams, subscribeTeamMembers } from '../services/team';

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

/** The given teams (e.g. the signed-in employee's), A–Z. */
export function useTeams(teamIds: string[]) {
  const [all, setAll] = useState<Team[] | null>(null);
  useEffect(() => subscribeAllTeams(setAll), []);
  const key = teamIds.join(',');
  const teams = useMemo(
    () => (all ?? []).filter(t => teamIds.includes(t.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, key],
  );
  return { teams, loading: all === null };
}
