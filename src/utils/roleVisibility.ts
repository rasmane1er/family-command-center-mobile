export function isParentRole(role?: string, isAdmin?: boolean) {
  return role === 'parent' || role === 'guardian' || isAdmin === true;
}

export function isChildRole(role?: string) {
  return role === 'child';
}

export function isGrandparentRole(role?: string) {
  return role === 'grandparent';
}

export function getVisibleTasks<T extends { assignedTo?: string[] }>(
  tasks: T[],
  activeMember?: { id: string; role?: string }
): T[] {
  if (activeMember?.role === 'child') {
    return tasks.filter((task) => task.assignedTo?.includes(activeMember.id));
  }

  return tasks;
}

export function getVisibleEvents<T extends { attendees?: string[] }>(
  events: T[],
  activeMember?: { id: string; role?: string }
): T[] {
  if (activeMember?.role === 'child') {
    return events.filter((event) => event.attendees?.includes(activeMember.id));
  }

  return events;
}