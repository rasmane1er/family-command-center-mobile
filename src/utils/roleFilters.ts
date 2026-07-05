import type { NotificationType } from '../store/useNotificationsStore';

export function getAllowedNotificationTypes(role?: string): NotificationType[] {
  if (role === 'parent' || role === 'guardian') {
    return [
      'task',
      'bill',
      'goal',
      'health',
      'family',
      'ai',
      'emergency',
      'achievement',
      'school',
    ];
  }

  if (role === 'child') {
    return ['task', 'achievement', 'family', 'ai', 'emergency', 'school'];
  }

  if (role === 'grandparent') {
    return ['family', 'health', 'ai', 'emergency'];
  }

  return [
    'task',
    'bill',
    'goal',
    'health',
    'family',
    'ai',
    'emergency',
    'achievement',
    'school',
  ];
}