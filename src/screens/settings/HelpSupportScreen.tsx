import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../theme/ThemeContext';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useChatStore } from '../../store/useChatStore';

const SUPPORT_EMAIL = 'support@myfamilycommandcenter.com';

// ─── Data ────────────────────────────────────────────────────────────────────

const FAQ_CATEGORIES = [
  {
    category: 'Getting Started',
    icon: 'rocket-outline' as const,
    items: [
      {
        q: 'How do I add family members?',
        a: 'Go to Family Hub → tap the + button → enter their name, role, and avatar color. You can invite them via QR code from the Family Profiles screen.',
      },
      {
        q: 'What is demo mode?',
        a: 'Demo mode pre-fills the app with a sample family so you can explore all features without entering real data. Reset it anytime from Settings → Developer → Reset App Data.',
      },
      {
        q: 'How do I switch between family member profiles?',
        a: 'Tap your avatar in the top-right of any screen, or go to Family Hub → Profiles. Each member has their own view of tasks, health, and achievements.',
      },
    ],
  },
  {
    category: 'Finance',
    icon: 'wallet-outline' as const,
    items: [
      {
        q: 'Is my financial data stored securely?',
        a: 'All data is stored locally on your device using encrypted storage. Nothing is sent to external servers unless you enable cloud sync.',
      },
      {
        q: 'How do I add a bank account?',
        a: "Go to Finance → tap 'Add Account'. You can manually enter balances or connect via our upcoming bank sync feature.",
      },
      {
        q: 'Can I track shared family expenses?',
        a: "Yes! When adding a transaction, toggle 'Shared' to split it among family members. Budget categories auto-update across all shared accounts.",
      },
    ],
  },
  {
    category: 'AI Assistant',
    icon: 'sparkles-outline' as const,
    items: [
      {
        q: 'How many AI queries do I get?',
        a: 'Free plan: 10 queries/month. Premium: 100/month. Family Pro: unlimited. Queries reset on the 1st of each month.',
      },
      {
        q: 'What can the AI assistant do?',
        a: "Ask it anything about your family: budget advice, meal planning, chore scheduling, health reminders, and more. The Family Digital Twin learns your family's patterns over time.",
      },
      {
        q: 'Is my AI conversation data private?',
        a: 'AI queries are processed by OpenAI/Anthropic APIs. No conversation data is stored on our servers. You can clear your AI history anytime from AI → Memory.',
      },
    ],
  },
  {
    category: 'Account & Settings',
    icon: 'person-circle-outline' as const,
    items: [
      {
        q: 'How do I change my password?',
        a: "Go to Settings → scroll to the Account section → tap 'Change Password'. You'll need your current password to set a new one.",
      },
      {
        q: 'Can I use the app on multiple devices?',
        a: 'Cloud sync (Premium+) lets you access your family data on up to 5 devices. Changes sync within 30 seconds.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Settings → Account → Delete Account. This will permanently erase all local data. This action cannot be undone.',
      },
    ],
  },
  {
    category: 'Subscription',
    icon: 'diamond-outline' as const,
    items: [
      {
        q: "What's included in Family Pro?",
        a: 'Everything in Premium plus: unlimited AI queries, Military Mode for structured households, the Family Digital Twin AI feature, priority customer support, and up to 20 family members.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Subscriptions are managed through the App Store (iOS) or Google Play (Android). Go to your device\'s subscription settings to cancel anytime. You keep Pro features until the end of the billing period.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes! New accounts get a 14-day Family Pro trial automatically. No credit card required.',
      },
    ],
  },
];

const TICKET_CATEGORIES = ['General', 'Bug Report', 'Feature Request', 'Billing', 'Account'];

// ─── Style factory ────────────────────────────────────────────────────────────

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Header
    header: {
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitleBlock: {
      flex: 1,
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    headerSubtitle: {
      color: 'rgba(255,255,255,0.70)',
      fontSize: 13,
      marginTop: 2,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      marginTop: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      marginLeft: 8,
      paddingVertical: 0,
    },
    clearBtn: {
      padding: 4,
    },
    // Content
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 12,
    },
    // Quick contact
    contactRow: {
      flexDirection: 'row',
      gap: 12,
    },
    contactCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    contactIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    contactLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    // FAQ category header
    faqCategoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 8,
    },
    faqCategoryIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    faqCategoryLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    // FAQ accordion item
    faqCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      marginBottom: 8,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    faqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    faqQuestion: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 20,
      marginRight: 8,
    },
    faqAnswer: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    faqDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyStateText: {
      fontSize: 15,
      color: colors.textMuted,
      marginTop: 10,
      textAlign: 'center',
    },
    // Ticket form
    ticketCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    ticketFieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 14,
    },
    ticketInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      fontSize: 15,
      color: colors.text,
    },
    ticketTextArea: {
      height: 96,
      textAlignVertical: 'top',
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    categoryChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '12',
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    categoryChipTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    sendBtn: {
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 20,
    },
    sendBtnGradient: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    sendBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    // Footer
    footer: {
      marginTop: 36,
      alignItems: 'center',
      paddingHorizontal: 20,
      gap: 4,
    },
    footerText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccordionItem({
  question,
  answer,
  s,
}: {
  question: string;
  answer: string;
  s: ReturnType<typeof makeStyles>;
}) {
  const [open, setOpen] = useState(false);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  }

  return (
    <View style={s.faqCard}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={toggle} style={s.faqRow}>
        <Text style={s.faqQuestion}>{question}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={open ? '#1E4A8A' : '#94A3B8'}
        />
      </TouchableOpacity>
      {open && (
        <>
          <View style={s.faqDivider} />
          <Text style={s.faqAnswer}>{answer}</Text>
        </>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function HelpSupportScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [searchText, setSearchText] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const createThread = useChatStore((s) => s.createThread);

  // ── Filtering FAQ ──────────────────────────────────────────────────────────
  const query = searchText.trim().toLowerCase();

  const filteredCategories = FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !query ||
        item.q.toLowerCase().includes(query) ||
        item.a.toLowerCase().includes(query),
    ),
  })).filter((cat) => cat.items.length > 0);

  const totalResults = filteredCategories.reduce((n, c) => n + c.items.length, 0);

  // ── Ticket submit ──────────────────────────────────────────────────────────
  // Was previously fully fake — cleared the form and showed a success alert
  // with no actual submission anywhere. Now creates a real support thread
  // via the same backend the Live Chat screen uses (POST /chat/threads),
  // so the message genuinely reaches the support team and the user can
  // continue the conversation from Live Chat.
  async function handleSendMessage() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert(t('helpSupport.missingFieldsTitle'), t('helpSupport.missingFieldsMsg'));
      return;
    }
    setIsSending(true);
    try {
      const threadId = await createThread({ subject: subject.trim(), category: selectedCategory, body: message.trim() });
      if (!threadId) throw new Error('No thread created');
      setSubject('');
      setMessage('');
      setSelectedCategory('General');
      Alert.alert(
        t('helpSupport.sentTitle'),
        t('helpSupport.sentMsg'),
        [
          { text: t('helpSupport.viewInLiveChat'), onPress: () => navigation.navigate('LiveChat') },
          { text: t('common.ok'), style: 'cancel' },
        ],
      );
    } catch {
      Alert.alert(t('helpSupport.sendFailedTitle'), t('helpSupport.sendFailedMsg'));
    } finally {
      setIsSending(false);
    }
  }

  // ── Quick contact handlers ────────────────────────────────────────────────
  async function openEmail() {
    const url = `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        offerCopyEmail();
        return;
      }
      await Linking.openURL(url);
    } catch {
      offerCopyEmail();
    }
  }

  function offerCopyEmail() {
    Alert.alert(
      t('helpSupport.noMailAppTitle'),
      t('helpSupport.noMailAppMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('helpSupport.copyEmail'),
          onPress: async () => {
            await Clipboard.setStringAsync(SUPPORT_EMAIL);
            Alert.alert(t('helpSupport.emailCopiedTitle'), t('helpSupport.emailCopiedMsg'));
          },
        },
      ],
    );
  }

  function openLiveChat() {
    navigation.navigate('LiveChat');
  }

  const screenHeader = (
    <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[s.header, { paddingTop: insets.top + 16 }]}>
      <View style={s.headerTopRow}>
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={s.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerTitleBlock}>
          <Text style={s.headerTitle}>{t('helpSupport.title')}</Text>
          <Text style={s.headerSubtitle}>{t('helpSupport.subtitle')}</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={s.searchBar}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput accessibilityLabel={t('helpSupport.searchPlaceholder')}
          style={s.searchInput}
          placeholder={t('helpSupport.searchPlaceholder')}
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {searchText.length > 0 && (
          <TouchableOpacity accessibilityRole="button" style={s.clearBtn} onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#0F2952', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={s.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { flex: 1, marginLeft: 8 }]}>{t('helpSupport.title')}</Text>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[s.scrollContent, { paddingTop: contentPaddingTop }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Contact ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('helpSupport.contactUs')}</Text>
          <View style={s.contactRow}>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} style={s.contactCard} onPress={openEmail}>
              <View style={s.contactIconCircle}>
                <Ionicons name="mail-outline" size={24} color={colors.primary} />
              </View>
              <Text style={s.contactLabel}>{t('helpSupport.emailUs')}</Text>
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} style={s.contactCard} onPress={openLiveChat}>
              <View style={s.contactIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
              </View>
              <Text style={s.contactLabel}>{t('helpSupport.liveChat')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FAQ Section ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            {query ? `Results for "${searchText}"` : 'Frequently Asked Questions'}
          </Text>

          {totalResults === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.textMuted} />
              <Text style={s.emptyStateText}>No results for "{searchText}"</Text>
            </View>
          ) : (
            filteredCategories.map((cat) => (
              <View key={cat.category} style={{ marginBottom: 20 }}>
                {/* Category header — only show when not filtering */}
                {!query && (
                  <View style={s.faqCategoryHeader}>
                    <View style={s.faqCategoryIcon}>
                      <Ionicons name={cat.icon} size={16} color={colors.primary} />
                    </View>
                    <Text style={s.faqCategoryLabel}>{cat.category}</Text>
                  </View>
                )}
                {cat.items.map((item) => (
                  <AccordionItem key={item.q} question={item.q} answer={item.a} s={s} />
                ))}
              </View>
            ))
          )}
        </View>

        {/* ── Submit a Ticket ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('helpSupport.submitTicket')}</Text>
          <View style={s.ticketCard}>
            <Text style={[s.ticketFieldLabel, { marginTop: 0 }]}>Subject</Text>
            <TextInput accessibilityLabel="Brief description of your issue"
              style={s.ticketInput}
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
              returnKeyType="next"
            />

            <Text style={s.ticketFieldLabel}>Category</Text>
            <View style={s.categoryRow}>
              {TICKET_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={cat}
                    activeOpacity={0.7}
                    style={[s.categoryChip, active && s.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.ticketFieldLabel}>Message</Text>
            <TextInput accessibilityLabel="Describe your issue in detail…"
              style={[s.ticketInput, s.ticketTextArea]}
              placeholder="Describe your issue in detail…"
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              returnKeyType="default"
            />

            <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} style={s.sendBtn} onPress={handleSendMessage} disabled={isSending}>
              <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[s.sendBtnGradient, isSending && { opacity: 0.6 }]}>
                {isSending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.sendBtnText}>Send Message</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>{t('helpSupport.version')}</Text>
          <Text style={s.footerText}>📱 Available on iOS & Android</Text>
        </View>
      </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}
