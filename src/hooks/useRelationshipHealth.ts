import { useMemo } from 'react';
import { useFamilyStore } from '../store/useFamilyStore';
import type { FamilyMember, CalendarEvent, Task } from '../types';

// ─── scoring helpers ──────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

const DAY_MS = 24 * 60 * 60 * 1000;

function taskDate(t: Task): string {
  return t.completedAt ?? t.dueDate ?? t.createdAt;
}

interface SharedActivity {
  title: string;
  date: string;
}

function sharedActivitiesFor(memberAId: string, memberBId: string, events: CalendarEvent[], tasks: Task[]): SharedActivity[] {
  const sharedEvents = events
    .filter((e) => e.attendees?.includes(memberAId) && e.attendees?.includes(memberBId))
    .map((e) => ({ title: e.title, date: e.startDate }));

  const sharedTasks = tasks
    .filter((t) => t.assignedTo?.includes(memberAId) && t.assignedTo?.includes(memberBId))
    .map((t) => ({ title: t.title, date: taskDate(t) }));

  return [...sharedEvents, ...sharedTasks].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Bond score (0-100). Base 40 (neutral — a pair with no shared data yet
 * isn't "bad", just unmeasured). Up to 30 pts for activity volume, up to
 * 30 pts for recency, both derived from real shared calendar events + tasks.
 */
function calcBondScore(activities: SharedActivity[]): number {
  if (activities.length === 0) return 40;

  const now = Date.now();
  const volumeScore = clamp(Math.min(activities.length, 6) * 5, 0, 30);

  const mostRecentAgeDays = (now - new Date(activities[0].date).getTime()) / DAY_MS;
  const recencyScore =
    mostRecentAgeDays <= 14 ? 30 :
    mostRecentAgeDays <= 30 ? 20 :
    mostRecentAgeDays <= 60 ? 10 : 0;

  return clamp(40 + volumeScore + recencyScore, 0, 100);
}

function calcTrend(activities: SharedActivity[]): 'up' | 'down' | 'stable' {
  const now = Date.now();
  const last14 = activities.filter((a) => now - new Date(a.date).getTime() <= 14 * DAY_MS).length;
  const prior14 = activities.filter((a) => {
    const age = now - new Date(a.date).getTime();
    return age > 14 * DAY_MS && age <= 28 * DAY_MS;
  }).length;

  if (last14 > prior14) return 'up';
  if (last14 < prior14) return 'down';
  return 'stable';
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export interface RelationshipBond {
  memberA: FamilyMember;
  memberB: FamilyMember;
  label: string;
  color: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  sharedCount: number;
  lastActivity: string;
}

export function useRelationshipHealth(): {
  bonds: RelationshipBond[];
  overallHealth: number;
  overallTrend: 'up' | 'down' | 'stable';
} {
  const members = useFamilyStore((s) => s.members);
  const events = useFamilyStore((s) => s.events);
  const tasks = useFamilyStore((s) => s.tasks);

  return useMemo(() => {
    const bonds: RelationshipBond[] = [];
    const allActivities: SharedActivity[] = [];

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const memberA = members[i];
        const memberB = members[j];
        const activities = sharedActivitiesFor(memberA.id, memberB.id, events, tasks);
        allActivities.push(...activities);

        bonds.push({
          memberA,
          memberB,
          label: `${memberA.name} & ${memberB.name}`,
          color: memberA.avatarColor,
          score: calcBondScore(activities),
          trend: calcTrend(activities),
          sharedCount: activities.length,
          lastActivity: activities.length > 0
            ? `${activities[0].title} · ${formatRelativeDate(activities[0].date)}`
            : 'No shared activity yet',
        });
      }
    }

    bonds.sort((a, b) => b.score - a.score);

    const overallHealth = bonds.length > 0
      ? clamp(bonds.reduce((sum, b) => sum + b.score, 0) / bonds.length)
      : 50;

    const overallTrend = calcTrend(allActivities);

    return { bonds, overallHealth, overallTrend };
  }, [members, events, tasks]);
}
