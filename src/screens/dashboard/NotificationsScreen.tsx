import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';

import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useNotificationsStore, NotificationType } from '../../store/useNotificationsStore';
import { getAllowedNotificationTypes } from '../../utils/roleFilters';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  task: { icon: 'checkbox', color: '#2980B9', bg: '#EBF5FB' },
  bill: { icon: 'receipt', color: '#E74C3C', bg: '#FDEDEC' },
  goal: { icon: 'flag', color: '#27AE60', bg: '#D5F5E3' },
  health: { icon: 'heart', color: '#E91E63', bg: '#FCE4EC' },
  family: { icon: 'people', color: '#8E44AD', bg: '#F5EEF8' },
  ai: { icon: 'sparkles', color: '#F5A623', bg: '#FEF3E2' },
  emergency: { icon: 'warning', color: '#E74C3C', bg: '#FDEDEC' },
  achievement: { icon: 'trophy', color: '#F5A623', bg: '#FEF3E2' },
  school: { icon: 'school', color: '#1E4A8A', bg: '#EBF5FB' },
};

export function NotificationsScreen({ navigation }: any) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { notifications, markRead, markAllRead, deleteNotification, clearAll } =
    useNotificationsStore();

  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const members = useFamilyStore((s) => s.members);

  const activeMember = members.find((member) => member.id === activeMemberId);
  const allowedTypes = getAllowedNotificationTypes(activeMember?.role);

  const roleNotifications = notifications.filter((notification) =>
    allowedTypes.includes(notification.type)
  );

  const unreadCount = roleNotifications.filter((n) => !n.isRead).length;

  const displayed =
    filter === 'unread'
      ? roleNotifications.filter((n) => !n.isRead)
      : roleNotifications;

  // Routes nested inside a tab's own stack (not bare tab names) need the
  // `{screen: X}` form to resolve from here — NotificationsScreen sits as a
  // sibling of the Tabs screen in MainNavigator, not inside the tab
  // navigator itself. Bare tab names (e.g. 'Finance', 'Family') resolve
  // fine on their own via React Navigation's action bubbling.
  const NESTED_FAMILY_ROUTES = [
    'JoinRequests', 'SOSAlerts', 'ApprovalRequests', 'GiftPlanner', 'BirthdayTracker',
    'FamilyConnect', 'FamilyBoard', 'Allowance', 'SchoolCenter', 'GuardianChat',
  ];
  const NESTED_OPERATIONS_ROUTES = ['ChildcareManager'];

  const handlePress = (id: string, route?: string, params?: Record<string, string>) => {
    markRead(id);

    if (!route) return;

    if (NESTED_FAMILY_ROUTES.includes(route)) {
      navigation.navigate('Family', { screen: route, params, initial: false } as never);
      return;
    }

    if (NESTED_OPERATIONS_ROUTES.includes(route)) {
      navigation.navigate('Operations', { screen: route, params, initial: false } as never);
      return;
    }

    navigation.navigate(route as never);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNotification(id),
      },
    ]);
  };

  const screenHeader = (
    <LinearGradient
      colors={['#0F2952', '#1E4A8A']}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          {unreadCount > 0 && <Text style={styles.headerSub}>{unreadCount} unread</Text>}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable onPress={markAllRead} style={styles.headerActionBtn}>
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={styles.headerActionText}>{t('notifications.markAllRead')}</Text>
            </Pressable>
          )}
          {roleNotifications.length > 0 && (
            <Pressable
              onPress={() =>
                Alert.alert(
                  'Clear All Notifications',
                  'This will permanently remove all notifications. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear All', style: 'destructive', onPress: clearAll },
                  ]
                )
              }
              style={[styles.headerActionBtn, styles.clearBtn]}
            >
              <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              <Text style={[styles.headerActionText, { color: '#FF6B6B' }]}>{t('notifications.clearAll')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'unread'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingTop: insets.top,
        paddingBottom: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 }}>{t('notifications.title')}</Text>
      {unreadCount > 0 && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{unreadCount}</Text>
        </View>
      )}
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
          >
        {displayed.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              No {filter === 'unread' ? 'unread ' : ''}notifications
            </Text>
            <Text style={styles.emptyDesc}>
              You're all caught up! Notifications about tasks, bills, and family events will
              appear here.
            </Text>
          </View>
        ) : (
          displayed.map((notif) => {
            const cfg = TYPE_CONFIG[notif.type];

            return (
              <Pressable
                key={notif.id}
                onPress={() => handlePress(notif.id, notif.action?.route, notif.action?.params)}
                onLongPress={() => handleDelete(notif.id)}
              >
                <Card
                  style={{ ...styles.card, ...(notif.isRead ? {} : styles.cardUnread) }}
                  variant="elevated"
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, !notif.isRead && styles.notifTitleBold]}>
                          {notif.title}
                        </Text>
                        {!notif.isRead && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={styles.notifBody} numberOfLines={2}>
                        {notif.body}
                      </Text>

                      <View style={styles.metaRow}>
                        <Text style={styles.timeText}>
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </Text>

                        {notif.action && (
                          <Text style={[styles.actionText, { color: cfg.color }]}>
                            {notif.action.label} →
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}

        {displayed.length > 0 && (
          <Text style={styles.hint}>{t('notifications.hint')}</Text>
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  clearBtn: { backgroundColor: 'rgba(255,107,107,0.15)' },

  headerActionText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  filterRow: { flexDirection: 'row', gap: 8 },

  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  filterChipActive: { backgroundColor: '#fff' },

  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },

  filterChipTextActive: { color: colors.primary },

  content: { padding: 16 },

  card: { marginBottom: 10, borderRadius: 14 },

  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },

  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },

  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },

  notifTitleBold: { fontWeight: '800' },

  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  notifBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  timeText: { fontSize: 11, color: colors.textMuted },

  actionText: { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 80 },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },

  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },

  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 16,
  },
});