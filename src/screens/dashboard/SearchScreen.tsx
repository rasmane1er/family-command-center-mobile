import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useLegacyStore } from '../../store/useLegacyStore';

type ResultCategory =
  | 'member'
  | 'task'
  | 'event'
  | 'bill'
  | 'transaction'
  | 'pantry'
  | 'document'
  | 'memory'
  | 'legacy';

interface SearchResult {
  id: string;
  category: ResultCategory;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route?: string;
  routeParams?: any;
}

const CAT_CONFIG: Record<ResultCategory, { icon: string; color: string; label: string }> = {
  member: { icon: 'person', color: '#8E44AD', label: 'Member' },
  task: { icon: 'checkbox', color: '#2980B9', label: 'Task' },
  event: { icon: 'calendar', color: '#F5A623', label: 'Event' },
  bill: { icon: 'receipt', color: '#E74C3C', label: 'Bill' },
  transaction: { icon: 'card', color: '#27AE60', label: 'Transaction' },
  pantry: { icon: 'nutrition', color: '#E67E22', label: 'Pantry' },
  document: { icon: 'document-text', color: '#1565C0', label: 'Document' },
  memory: { icon: 'albums', color: '#6A1B9A', label: 'Memory' },
  legacy: { icon: 'library', color: '#7B2D8B', label: 'Legacy' },
};

const RECENT_SEARCHES = ['Budget this month', 'Aiden homework', 'Car insurance', 'Hawaii vacation fund'];

export function SearchScreen({ navigation: navProp }: any) {
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);
  const events = useFamilyStore((s) => s.events);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const activeMember = members.find((m) => m.id === activeMemberId);

  const isParent =
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian' ||
    activeMember?.isAdmin === true;

  const isChild = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';

  const { bills, transactions } = useFinanceStore();
  const { pantryItems, documents } = useOperationsStore();
  const memories = useMemoryStore((s) => s.memories);
  const legacyItems = useLegacyStore((s) => s.items);

  const visibleTasks =
    isChild && activeMember
      ? tasks.filter((task) => task.assignedTo?.includes(activeMember.id))
      : tasks;

  const visibleEvents =
    isChild && activeMember
      ? events.filter((event) => event.attendees?.includes(activeMember.id))
      : events;

  const browseSections = useMemo(() => {
    if (isChild) {
      return [
        {
          label: 'My Tasks',
          icon: 'checkbox',
          color: '#2980B9',
          bg: '#EBF5FB',
          route: 'Family',
          params: {
            screen: 'Tasks',
            params: {
              memberId: activeMember?.id,
              role: activeMember?.role,
              source: 'search',
            },
          },
        },
        {
          label: 'My Calendar',
          icon: 'calendar',
          color: '#F5A623',
          bg: '#FEF3E2',
          route: 'Family',
          params: { screen: 'Calendar' },
        },
        {
          label: 'Homework',
          icon: 'school',
          color: '#1565C0',
          bg: '#E3F2FD',
          route: 'Family',
          params: {
            screen: 'HomeworkTracker',
            params: {
              memberId: activeMember?.id,
              role: activeMember?.role,
              source: 'search',
            },
          },
        },
        {
          label: 'Rewards',
          icon: 'trophy',
          color: '#F5A623',
          bg: '#FEF3E2',
          route: 'Operations',
          params: {
            screen: 'Rewards',
            params: {
              memberId: activeMember?.id,
              role: activeMember?.role,
              source: 'search',
            },
          },
        },
      ];
    }

    if (isGrandparent) {
      return [
        {
          label: 'Calendar',
          icon: 'calendar',
          color: '#F5A623',
          bg: '#FEF3E2',
          route: 'Family',
          params: { screen: 'Calendar' },
        },
        {
          label: 'Family Board',
          icon: 'people',
          color: '#8E44AD',
          bg: '#F5EEF8',
          route: 'Family',
          params: { screen: 'FamilyBoard' },
        },
        {
          label: 'Timeline',
          icon: 'time',
          color: '#2980B9',
          bg: '#EBF5FB',
          route: 'Family',
          params: { screen: 'FamilyTimeline' },
        },
        {
          label: 'Legacy',
          icon: 'library',
          color: '#7B2D8B',
          bg: '#F5EEF8',
          route: 'Family',
          params: { screen: 'LegacyVault' },
        },
      ];
    }

    return [
      {
        label: 'Tasks',
        icon: 'checkbox',
        color: '#2980B9',
        bg: '#EBF5FB',
        route: 'Family',
        params: { screen: 'Tasks' },
      },
      {
        label: 'Calendar',
        icon: 'calendar',
        color: '#F5A623',
        bg: '#FEF3E2',
        route: 'Family',
        params: { screen: 'Calendar' },
      },
      {
        label: 'Finance',
        icon: 'wallet',
        color: '#27AE60',
        bg: '#D5F5E3',
        route: 'Finance',
      },
      {
        label: 'Pantry',
        icon: 'nutrition',
        color: '#E67E22',
        bg: '#FEF0E2',
        route: 'Operations',
        params: { screen: 'Pantry' },
      },
      {
        label: 'Documents',
        icon: 'document-text',
        color: '#1565C0',
        bg: '#E3F2FD',
        route: 'Operations',
        params: { screen: 'Documents' },
      },
      {
        label: 'AI Memory',
        icon: 'albums',
        color: '#6A1B9A',
        bg: '#F3E5F5',
        route: 'AI Assistant',
        params: { screen: 'AIMemory' },
      },
    ];
  }, [isChild, isGrandparent, activeMember]);

  const placeholder = isChild
    ? 'Search my tasks, homework, events...'
    : isGrandparent
      ? 'Search family events, memories, timeline...'
      : 'Search everything — tasks, bills, pantry...';

  const results: SearchResult[] = useMemo(() => {
    if (query.trim().length < 2) return [];

    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    members
      .filter((m) => m.name.toLowerCase().includes(q) || m.role.includes(q))
      .slice(0, 3)
      .forEach((m) => {
        out.push({
          id: m.id,
          category: 'member',
          title: m.name,
          subtitle: m.role,
          icon: 'person',
          color: m.avatarColor,
        });
      });

    visibleTasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((t) => {
        out.push({
          id: t.id,
          category: 'task',
          title: t.title,
          subtitle: `${t.priority} priority • ${t.status}`,
          icon: 'checkbox',
          color: t.status === 'overdue' ? colors.danger : '#2980B9',
          route: 'Family',
          routeParams: {
            screen: 'Tasks',
            params: {
              memberId: activeMember?.id,
              role: activeMember?.role,
              source: 'search',
            },
          },
        });
      });

    visibleEvents
      .filter((e) => e.title.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((e) => {
        out.push({
          id: e.id,
          category: 'event',
          title: e.title,
          subtitle: e.location || 'No location',
          icon: 'calendar',
          color: e.color || '#F5A623',
          route: 'Family',
          routeParams: { screen: 'Calendar' },
        });
      });

    if (isParent) {
      bills
        .filter((b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((b) => {
          out.push({
            id: b.id,
            category: 'bill',
            title: b.name,
            subtitle: `$${b.amount} • ${b.status}`,
            icon: 'receipt',
            color: '#E74C3C',
            route: 'Finance',
          });
        });

      transactions
        .filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .forEach((t) => {
          out.push({
            id: t.id,
            category: 'transaction',
            title: t.description,
            subtitle: `$${Math.abs(t.amount)} • ${t.category}`,
            icon: 'card',
            color: '#27AE60',
            route: 'Finance',
          });
        });

      documents
        .filter((d) => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
        .slice(0, 2)
        .forEach((d) => {
          out.push({
            id: d.id,
            category: 'document',
            title: d.title,
            subtitle: d.category,
            icon: 'document-text',
            color: '#1565C0',
            route: 'Operations',
            routeParams: { screen: 'Documents' },
          });
        });
    }

    if (!isChild) {
      pantryItems
        .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((p) => {
          out.push({
            id: p.id,
            category: 'pantry',
            title: p.name,
            subtitle: `${p.quantity} ${p.unit} • ${p.category}`,
            icon: 'nutrition',
            color: '#E67E22',
            route: 'Operations',
            routeParams: { screen: 'Pantry' },
          });
        });
    }

    if (!isChild || isGrandparent) {
      memories
        .filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.content.toLowerCase().includes(q) ||
            m.tags.some((t) => t.toLowerCase().includes(q))
        )
        .slice(0, 2)
        .forEach((m) => {
          out.push({
            id: m.id,
            category: 'memory',
            title: m.title,
            subtitle: m.content.slice(0, 60) + '...',
            icon: 'albums',
            color: '#6A1B9A',
            route: 'AI Assistant',
            routeParams: { screen: 'AIMemory' },
          });
        });

      legacyItems
        .filter((i) => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q))
        .slice(0, 2)
        .forEach((i) => {
          out.push({
            id: i.id,
            category: 'legacy',
            title: i.title,
            subtitle: i.content.slice(0, 60) + '...',
            icon: 'library',
            color: '#7B2D8B',
            route: 'Family',
            routeParams: { screen: 'LegacyVault' },
          });
        });
    }

    return out;
  }, [
    query,
    members,
    visibleTasks,
    visibleEvents,
    bills,
    transactions,
    pantryItems,
    documents,
    memories,
    legacyItems,
    isParent,
    isChild,
    isGrandparent,
    activeMember,
  ]);

  const grouped = useMemo(() => {
    const g: Partial<Record<ResultCategory, SearchResult[]>> = {};
    results.forEach((r) => {
      if (!g[r.category]) g[r.category] = [];
      g[r.category]!.push(r);
    });
    return g;
  }, [results]);

  const handleResultPress = (result: SearchResult) => {
    if (!result.route) return;

    if (result.routeParams) {
      navigation.navigate(result.route, result.routeParams);
      return;
    }

    navigation.navigate(result.route);
  };

  const dynStyles = makeStyles(colors);

  return (
    <View style={dynStyles.container}>
      <StatusBar style="dark" />

      <View style={[dynStyles.header, { paddingTop: insets.top }]}>
        <View style={dynStyles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={dynStyles.searchInput}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />

          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => navigation.goBack()} style={dynStyles.cancelBtn}>
          <Text style={dynStyles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[dynStyles.content, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {query.trim().length < 2 ? (
          <>
            <Text style={dynStyles.sectionLabel}>Recent Searches</Text>

            {RECENT_SEARCHES.map((s) => (
              <Pressable key={s} onPress={() => setQuery(s)} style={dynStyles.recentRow}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text style={dynStyles.recentText}>{s}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}

            <Text style={[dynStyles.sectionLabel, { marginTop: 24 }]}>Browse Sections</Text>

            <View style={dynStyles.browseGrid}>
              {browseSections.map((b) => (
                <Pressable
                  key={b.label}
                  onPress={() => navigation.navigate(b.route as string, (b as any).params)}
                  style={[dynStyles.browseCard, { backgroundColor: b.bg }]}
                >
                  <Ionicons name={b.icon as any} size={22} color={b.color} />
                  <Text style={[dynStyles.browseLabel, { color: b.color }]}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : results.length === 0 ? (
          <View style={dynStyles.noResults}>
            <Ionicons name="search-outline" size={56} color={colors.textMuted} />
            <Text style={dynStyles.noResultsTitle}>No results for "{query}"</Text>
            <Text style={dynStyles.noResultsDesc}>Try searching with different keywords</Text>
          </View>
        ) : (
          <>
            <Text style={dynStyles.resultCount}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Text>

            {(Object.entries(grouped) as [ResultCategory, SearchResult[]][]).map(([cat, items]) => {
              const cfg = CAT_CONFIG[cat];

              return (
                <View key={cat}>
                  <View style={dynStyles.catHeader}>
                    <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                    <Text style={[dynStyles.catLabel, { color: cfg.color }]}>{cfg.label}s</Text>
                    <Text style={dynStyles.catCount}>{items.length}</Text>
                  </View>

                  {items.map((r) => (
                    <Pressable key={`${r.category}-${r.id}`} onPress={() => handleResultPress(r)}>
                      <Card style={dynStyles.resultCard} variant="elevated">
                        <View style={dynStyles.resultRow}>
                          <View style={[dynStyles.resultIcon, { backgroundColor: r.color + '20' }]}>
                            <Ionicons name={r.icon as any} size={18} color={r.color} />
                          </View>

                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={dynStyles.resultTitle}>{r.title}</Text>
                            <Text style={dynStyles.resultSub} numberOfLines={1}>
                              {r.subtitle}
                            </Text>
                          </View>

                          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </View>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },

  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: { flex: 1, fontSize: 15, color: colors.text },

  cancelBtn: { paddingVertical: 8 },

  cancelText: { fontSize: 15, color: colors.primary, fontWeight: '600' },

  content: { padding: 16 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
    marginTop: 4,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  recentText: { flex: 1, fontSize: 14, color: colors.text },

  browseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  browseCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },

  browseLabel: { fontSize: 13, fontWeight: '700' },

  noResults: { alignItems: 'center', paddingTop: 60 },

  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },

  noResultsDesc: { fontSize: 14, color: colors.textSecondary },

  resultCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 12 },

  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 12,
  },

  catLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  catCount: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  resultCard: { marginBottom: 8, borderRadius: 12 },

  resultRow: { flexDirection: 'row', alignItems: 'center' },

  resultIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },

  resultSub: { fontSize: 12, color: colors.textSecondary },
  });
}