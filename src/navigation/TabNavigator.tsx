import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useNotificationsStore } from '../store/useNotificationsStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { getAllowedNotificationTypes } from '../utils/roleFilters';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { FamilyNavigator } from './FamilyNavigator';
import { FinanceNavigator } from './FinanceNavigator';
import { OperationsNavigator } from './OperationsNavigator';
import { AINavigator } from './AINavigator';
import { CustomTabBar } from './CustomTabBar';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const notifications  = useNotificationsStore((s) => s.notifications);
  const members        = useFamilyStore((s) => s.members);
  const tasks          = useFamilyStore((s) => s.tasks);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const overdueBills   = useFinanceStore((s) => s.bills.filter((b) => b.status === 'overdue').length);

  const activeMember = members.find((m) => m.id === activeMemberId);

  // If activeMember hasn't resolved yet (store still loading), default to
  // parent so Finance/Operations tabs don't flash away and then reappear.
  // Only restrict tabs once we positively know the active member is a child.
  const isParent =
    !activeMember ||
    activeMember.role === 'parent' ||
    activeMember.role === 'guardian' ||
    activeMember.isAdmin === true;

  const isChild = activeMember?.role === 'child';

  const allowedTypes         = getAllowedNotificationTypes(activeMember?.role);
  const visibleNotifications = notifications.filter((n) => allowedTypes.includes(n.type));
  const unreadNotifications  = visibleNotifications.filter((n) => !n.isRead).length;

  const visibleTasks = isChild && activeMember
    ? tasks.filter((t) => t.assignedTo?.includes(activeMember.id))
    : tasks;

  const pendingTasks = visibleTasks.filter((t) => t.status !== 'completed').length;

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      backBehavior="none"
    >
      <Tab.Screen
        name="Home"
        component={withScreenErrorBoundary(DashboardScreen)}
        options={{ tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined }}
      />

      <Tab.Screen
        name="Family"
        component={withScreenErrorBoundary(FamilyNavigator)}
        options={{ tabBarBadge: pendingTasks > 9 ? '9+' : pendingTasks > 0 ? pendingTasks : undefined }}
      />

      {isParent && (
        <Tab.Screen
          name="Finance"
          component={withScreenErrorBoundary(FinanceNavigator)}
          options={{ tabBarBadge: overdueBills > 0 ? overdueBills : undefined }}
        />
      )}

      {isParent && <Tab.Screen name="Operations" component={withScreenErrorBoundary(OperationsNavigator)} />}

      <Tab.Screen name="AI Assistant" component={withScreenErrorBoundary(AINavigator)} />
    </Tab.Navigator>
  );
}
