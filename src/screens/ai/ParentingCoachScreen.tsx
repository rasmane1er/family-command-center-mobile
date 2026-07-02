import React, { useState, useRef } from 'react';
import { ChatInputBar } from '../../components/ai/ChatInputBar';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { AIResetMenu } from '../../components/ai/AIResetMenu';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useCoachingStore, sessionKey } from '../../store/useCoachingStore';
import { chatWithParentingCoach, AIMessage } from '../../services/aiService';
import { computeAge } from '../../utils/buildFamilyContext';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTabBarInset } from '../../hooks/useTabBarInset';

interface SessionTopic {
  id: string;
  title: string;
}

const COACHING_MODULES: {
  id: string; title: string; icon: string; color: string; bg: string; desc: string; rating: number;
  sessionTopics: SessionTopic[];
}[] = [
  {
    id: 'm1', title: 'Positive Discipline', icon: 'heart', color: '#E74C3C', bg: '#FDEDEC',
    desc: 'Science-backed strategies that build connection while setting boundaries', rating: 4.9,
    sessionTopics: [
      { id: 's1', title: 'Setting boundaries without conflict' },
      { id: 's2', title: 'Natural consequences vs. punishment' },
      { id: 's3', title: 'Staying calm during meltdowns' },
      { id: 's4', title: 'Positive reinforcement techniques' },
      { id: 's5', title: 'Age-appropriate discipline strategies' },
      { id: 's6', title: 'Discipline without yelling' },
      { id: 's7', title: 'Building trust through consistency' },
      { id: 's8', title: 'Repairing the relationship after a discipline moment' },
    ],
  },
  {
    id: 'm2', title: 'Emotional Intelligence', icon: 'happy', color: '#F5A623', bg: '#FEF3E2',
    desc: 'Help your children identify and manage emotions effectively', rating: 4.8,
    sessionTopics: [
      { id: 's1', title: 'Naming and validating emotions' },
      { id: 's2', title: 'Teaching self-regulation skills' },
      { id: 's3', title: 'Modeling emotional awareness as a parent' },
      { id: 's4', title: 'Helping kids handle big feelings' },
      { id: 's5', title: 'Building empathy in children' },
      { id: 's6', title: 'Recognizing emotional triggers' },
    ],
  },
  {
    id: 'm3', title: 'Healthy Communication', icon: 'chatbubbles', color: '#2980B9', bg: '#EBF5FB',
    desc: 'Build open, honest family dialogue at every age', rating: 4.7,
    sessionTopics: [
      { id: 's1', title: 'Active listening with kids' },
      { id: 's2', title: 'Running family meetings that work' },
      { id: 's3', title: 'Talking about hard topics' },
      { id: 's4', title: 'Communicating across different ages' },
      { id: 's5', title: 'Reading nonverbal communication cues' },
    ],
  },
  {
    id: 'm4', title: 'Motivation & Rewards', icon: 'trophy', color: '#27AE60', bg: '#D5F5E3',
    desc: 'Move beyond punishments to intrinsic motivation systems', rating: 4.9,
    sessionTopics: [
      { id: 's1', title: 'Intrinsic vs. extrinsic motivation' },
      { id: 's2', title: 'Building a rewards system that actually works' },
      { id: 's3', title: 'Avoiding the bribery trap' },
      { id: 's4', title: 'Celebrating effort over outcome' },
    ],
  },
  {
    id: 'm5', title: 'Screen Time Balance', icon: 'phone-portrait', color: '#8E44AD', bg: '#F5EEF8',
    desc: 'Navigate the digital age with confidence and clear rules', rating: 4.6,
    sessionTopics: [
      { id: 's1', title: 'Setting healthy screen time limits' },
      { id: 's2', title: 'Talking to teens about phone use' },
      { id: 's3', title: 'Modeling balanced tech habits yourself' },
    ],
  },
  {
    id: 'm6', title: 'Building Resilience', icon: 'shield', color: '#16A085', bg: '#D1F2EB',
    desc: 'Raise kids who bounce back from adversity and setbacks', rating: 4.8,
    sessionTopics: [
      { id: 's1', title: 'Letting kids fail safely' },
      { id: 's2', title: 'Growth mindset language' },
      { id: 's3', title: 'Coping skills for setbacks' },
      { id: 's4', title: 'Building confidence through challenge' },
      { id: 's5', title: 'Supporting kids through big changes' },
      { id: 's6', title: 'Encouraging problem-solving' },
      { id: 's7', title: 'Modeling resilience yourself' },
    ],
  },
];

const DAILY_TIPS = [
  { tip: 'Instead of "Stop crying", try "I can see you\'re upset. Want to talk about it?" — validating emotions builds trust.', category: 'Emotional IQ', icon: 'heart', color: '#E74C3C' },
  { tip: "Name tasks as choices: 'Do you want to clean your room before or after dinner?' gives autonomy within your boundary.", category: 'Positive Discipline', icon: 'options', color: '#2980B9' },
  { tip: "Catch your child being good 3x more than you correct them. Positive reinforcement is 4x more effective than punishment.", category: 'Motivation', icon: 'star', color: '#F5A623' },
  { tip: "Set up a family meeting once a week. Kids who have voice in family decisions show 40% better behavioral outcomes.", category: 'Communication', icon: 'people', color: '#27AE60' },
];

const CHAT_INPUT_HEIGHT = 104;

const AGE_ADVICE: Record<string, { range: string; tips: string[] }> = {
  toddler: { range: '2–5 years', tips: ['Routines are gold — predictability = security', 'Simple choices build confidence', 'Natural consequences work better than time-outs'] },
  school: { range: '6–12 years', tips: ['Let them fail sometimes — struggle builds resilience', 'Ask "What do you think?" before giving answers', 'Chores teach responsibility — start now'] },
  teen: { range: '13–18 years', tips: ['Listen more, lecture less — they know you know', 'Negotiate rules together — buy-in beats compliance', 'Stay curious about their world without judging it'] },
};

export function ParentingCoachScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const [activeTab, setActiveTab] = useState<'modules' | 'tips' | 'advice' | 'chat'>('modules');
  const [tipIndex, setTipIndex] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const voice = useVoiceInput({ onResult: (text) => handleChatSend(text) });
  const [chatHistory, setChatHistory] = useState<AIMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [lastReply, setLastReply] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatScrollRef = useRef<ScrollView>(null);
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const children = members.filter((m) => m.role === 'child');
  const screenTimeRules = useGuardianStore((s) => s.screenTimeRules);
  const memories = useMemoryStore((s) => s.memories);

  // Subscribed directly so this component actually re-renders when progress
  // changes — see the comment on sessionKey() in useCoachingStore.ts for why
  // calling the store's getSession/getModuleCompleted methods during render
  // doesn't work (that was the bug: Mark Complete updated the store fine,
  // this screen just never redrew).
  const coachingProgress = useCoachingStore((s) => s.progress);
  const setSessionContent = useCoachingStore((s) => s.setSessionContent);
  const markComplete = useCoachingStore((s) => s.markComplete);
  const markIncomplete = useCoachingStore((s) => s.markIncomplete);

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionGenerating, setSessionGenerating] = useState(false);

  const moduleCompletedCounts = Object.fromEntries(
    COACHING_MODULES.map((m) => [
      m.id,
      activeMemberId
        ? m.sessionTopics.filter((t) => coachingProgress[sessionKey(activeMemberId, m.id, t.id)]?.completedAt).length
        : 0,
    ]),
  );

  const totalCompleted = Object.values(moduleCompletedCounts).reduce((s, c) => s + c, 0);
  const totalSessions = COACHING_MODULES.reduce((s, m) => s + m.sessionTopics.length, 0);
  const overallProgress = totalSessions > 0 ? totalCompleted / totalSessions : 0;

  const selectedModule = COACHING_MODULES.find((m) => m.id === selectedModuleId) ?? null;
  const selectedSessionTopic = selectedModule?.sessionTopics.find((t) => t.id === selectedSessionId) ?? null;
  const selectedSessionProgress =
    activeMemberId && selectedModule && selectedSessionId
      ? coachingProgress[sessionKey(activeMemberId, selectedModule.id, selectedSessionId)]
      : undefined;

  const openSession = async (moduleId: string, sessionId: string) => {
    setSelectedSessionId(sessionId);
    if (!activeMemberId) return;

    // Imperative one-off read (not during render) — fine to reach into the
    // store directly here rather than via the `coachingProgress` selector.
    const existing = useCoachingStore.getState().progress[sessionKey(activeMemberId, moduleId, sessionId)];
    if (existing?.content) return; // already cached — nothing to generate

    const module = COACHING_MODULES.find((m) => m.id === moduleId);
    const topic = module?.sessionTopics.find((t) => t.id === sessionId);
    if (!module || !topic) return;

    setSessionGenerating(true);
    const result = await chatWithParentingCoach({
      message: `Write a short (150-250 word) coaching lesson for the topic "${topic.title}", part of the "${module.title}" module (${module.desc}). Include one concrete, practical action step at the end. Write it directly as the lesson — no preamble.`,
      context: 'Generating structured coaching module content, not a live chat reply.',
    });
    setSessionContent(activeMemberId, moduleId, sessionId, result.reply);
    setSessionGenerating(false);
  };

  const getChildAgeGroup = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member?.dateOfBirth) return 'school';
    const age = new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear();
    if (age < 6) return 'toddler';
    if (age < 13) return 'school';
    return 'teen';
  };

  const handleChatSend = async (text?: string) => {
    const msg = text ?? chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const newHistory: AIMessage[] = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    setLastReply('');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    const childContext = children.length
      ? children.map((c) => {
          const age = computeAge(c.dateOfBirth);
          const rule = screenTimeRules.find((r) => r.memberId === c.id);
          return `${c.name} (age ${age}${rule ? `, ${rule.dailyLimitMinutes}min screen limit` : ''})`;
        }).join(', ')
      : 'no children';

    const childMembers = new Set(children.map((c) => c.id));
    const recentMemories = memories
      .filter((m) => m.memberId && childMembers.has(m.memberId))
      .slice(0, 3)
      .map((m) => m.title)
      .join(', ');

    const context = children.length
      ? `Children: ${childContext}${recentMemories ? `. Recent memories: ${recentMemories}` : ''}`
      : 'General parenting question';

    const result = await chatWithParentingCoach({ message: msg, context, history: chatHistory });
    const modelHistory: AIMessage[] = [...newHistory, { role: 'model', content: result.reply }];
    setChatHistory(modelHistory);
    setLastReply(result.reply);
    setSuggestions(result.suggestions);
    setChatLoading(false);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const screenHeader = (
      <LinearGradient colors={['#1A6B3C', '#27AE60']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>AI Parenting Coach</Text>
          <AIResetMenu actions={[
            { label: 'Clear Chat', description: 'Delete all chat messages', icon: 'chatbubble-outline', danger: true, onPress: () => setChatHistory([]) },
          ]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalCompleted}</Text>
            <Text style={styles.statLabel}>Sessions Done</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statValue}>{Math.round(overallProgress * 100)}%</Text>
            <Text style={styles.statLabel}>Overall Progress</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{children.length}</Text>
            <Text style={styles.statLabel}>Children</Text>
          </View>
        </View>
        <ProgressBar progress={overallProgress} color="#fff" height={6} />
      
    <View style={styles.tabs}>
            {(['modules', 'tips', 'advice', 'chat'] as const).map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'modules' ? 'Modules' : tab === 'tips' ? 'Tips' : tab === 'advice' ? 'Ages' : '✨ Ask AI'}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>

  );
  const screenCompact = (
    <LinearGradient
      colors={['#1A6B3C', '#27AE60']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>Parenting Coach</Text>
      <View />
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({
          onScroll,
          onScrollEndDrag,
          onMomentumScrollEnd,
          scrollEventThrottle,
          contentPaddingTop,
        }) => (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <ScrollView
              ref={activeTab === 'chat' ? chatScrollRef : undefined}
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              onScrollEndDrag={onScrollEndDrag}
              onMomentumScrollEnd={onMomentumScrollEnd}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={[
                styles.content,
                {
                  paddingTop: contentPaddingTop,
                  paddingBottom:
                    activeTab === 'chat'
                      ? tabBarInset + CHAT_INPUT_HEIGHT
                      : tabBarInset + 24,
                },
              ]}
            >
              {activeTab === 'modules' &&
                COACHING_MODULES.map((module) => {
                  const completed = moduleCompletedCounts[module.id] ?? 0;
                  const total = module.sessionTopics.length;
                  return (
                    <Pressable key={module.id} onPress={() => setSelectedModuleId(module.id)}>
                      <Card
                        style={{ ...styles.moduleCard, backgroundColor: module.bg }}
                        variant="default"
                      >
                        <View style={styles.moduleHeader}>
                          <View
                            style={[
                              styles.moduleIcon,
                              { backgroundColor: module.color + '25' },
                            ]}
                          >
                            <Ionicons name={module.icon as any} size={22} color={module.color} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.moduleTitle}>{module.title}</Text>
                            <Text style={styles.moduleDesc}>{module.desc}</Text>
                          </View>
                        </View>
                        <View style={styles.moduleFooter}>
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <ProgressBar
                              progress={total > 0 ? completed / total : 0}
                              color={module.color}
                              height={5}
                            />
                            <Text style={styles.moduleProg}>
                              {completed}/{total} sessions
                            </Text>
                          </View>
                          <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color={module.color} />
                            <Text style={[styles.ratingText, { color: module.color }]}>
                              {module.rating}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                })}

              {activeTab === 'tips' && (
                <Card style={styles.tipCard} variant="elevated">
                  <View style={styles.tipHeader}>
                    <View
                      style={[
                        styles.tipIcon,
                        { backgroundColor: DAILY_TIPS[tipIndex].color + '20' },
                      ]}
                    >
                      <Ionicons
                        name={DAILY_TIPS[tipIndex].icon as any}
                        size={24}
                        color={DAILY_TIPS[tipIndex].color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.tipCategory,
                        { color: DAILY_TIPS[tipIndex].color },
                      ]}
                    >
                      {DAILY_TIPS[tipIndex].category}
                    </Text>
                  </View>
                  <Text style={styles.tipText}>"{DAILY_TIPS[tipIndex].tip}"</Text>
                  <View style={styles.tipNav}>
                    <Pressable
                      onPress={() => setTipIndex(Math.max(0, tipIndex - 1))}
                      style={styles.tipNavBtn}
                    >
                      <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
                    </Pressable>
                    <Text style={styles.tipCounter}>
                      {tipIndex + 1} / {DAILY_TIPS.length}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setTipIndex(Math.min(DAILY_TIPS.length - 1, tipIndex + 1))
                      }
                      style={styles.tipNavBtn}
                    >
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </Card>
              )}

              {activeTab === 'advice' &&
                children.map((child) => {
                  const ageGroup = getChildAgeGroup(child.id);
                  const advice = AGE_ADVICE[ageGroup];
                  return (
                    <Card key={child.id} style={styles.adviceCard} variant="elevated">
                      <View style={styles.adviceHeader}>
                        <View
                          style={[
                            styles.childAvatar,
                            { backgroundColor: child.avatarColor + '30' },
                          ]}
                        >
                          <Text
                            style={[styles.childInitial, { color: child.avatarColor }]}
                          >
                            {child.name.charAt(0)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.childName}>{child.name}</Text>
                          <Text style={styles.ageRange}>Age group: {advice.range}</Text>
                        </View>
                      </View>
                      {advice.tips.map((tip, i) => (
                        <View key={i} style={styles.adviceTip}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={colors.success}
                          />
                          <Text style={styles.adviceTipText}>{tip}</Text>
                        </View>
                      ))}
                    </Card>
                  );
                })}

              {activeTab === 'chat' && (
                <View style={styles.chatPanel}>
                  {chatHistory.length === 0 && (
                    <View style={styles.chatEmpty}>
                      <Text style={styles.chatEmptyTitle}>Ask the AI Parenting Coach</Text>
                      <Text style={styles.chatEmptyDesc}>
                        Get personalized, evidence-based advice for your family
                      </Text>
                      {[
                        'How do I handle tantrums effectively?',
                        'Tips for improving homework habits',
                        'How to talk to my teen about phone limits',
                      ].map((q) => (
                        <Pressable
                          key={q}
                          style={styles.chatStarter}
                          onPress={() => handleChatSend(q)}
                        >
                          <Text style={styles.chatStarterText}>{q}</Text>
                          <Ionicons name="arrow-forward" size={14} color="#1A6B3C" />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {chatHistory.map((m, i) => (
                    <View
                      key={i}
                      style={[
                        styles.chatBubble,
                        m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI,
                      ]}
                    >
                      <Text
                        style={
                          m.role === 'user'
                            ? styles.chatBubbleUserText
                            : styles.chatBubbleAIText
                        }
                      >
                        {m.content}
                      </Text>
                    </View>
                  ))}

                  {chatLoading && (
                    <View style={[styles.chatBubble, styles.chatBubbleAI]}>
                      <ActivityIndicator size="small" color="#1A6B3C" />
                    </View>
                  )}

                  {suggestions.length > 0 &&
                    !chatLoading &&
                    suggestions.map((s) => (
                      <Pressable
                        key={s}
                        style={styles.chatSuggestion}
                        onPress={() => handleChatSend(s)}
                      >
                        <Text style={styles.chatSuggestionText}>{s}</Text>
                      </Pressable>
                    ))}
                </View>
              )}
            </ScrollView>

            {activeTab === 'chat' && (
              <View
                style={[
                  styles.chatInputDock,
                  {
                    paddingBottom: 8,
                    bottom: tabBarInset,
                  },
                ]}
              >
                <ChatInputBar
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSend={() => handleChatSend()}
                  onMicPressIn={voice.start}
                  onMicPressOut={voice.stop}
                  onMicCancel={voice.cancel}
                  isListening={voice.isListening}
                  partialTranscript={voice.partial}
                  placeholder="Ask your parenting question..."
                  bottomPadding={8}
                  accentColor="#1A6B3C"
                />
              </View>
            )}
          </KeyboardAvoidingView>
        )}
      </CollapsibleHeader>

      {/*
        Module detail + session viewer — ONE Modal that switches views
        internally (session list vs. session content) based on
        selectedSessionId. Two separate sibling <Modal> components, each
        independently `visible`, don't reliably stack on iOS — opening the
        session modal while the module modal was still visible caused taps
        on a session row to silently do nothing.
      */}
      <Modal
        visible={!!selectedModule}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => (selectedSessionId ? setSelectedSessionId(null) : setSelectedModuleId(null))}
      >
        {selectedModule && (
          <View style={styles.moduleModal}>
            <View style={styles.moduleModalHeader}>
              {selectedSessionId ? (
                <Pressable onPress={() => setSelectedSessionId(null)} style={styles.moduleModalClose}>
                  <Ionicons name="arrow-back" size={22} color={colors.text} />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleModalTitle}>
                  {selectedSessionId ? selectedSessionTopic?.title : selectedModule.title}
                </Text>
                <Text style={styles.moduleModalDesc}>
                  {selectedSessionId ? selectedModule.title : selectedModule.desc}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setSelectedSessionId(null);
                  setSelectedModuleId(null);
                }}
                style={styles.moduleModalClose}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {!selectedSessionId ? (
              <>
                <Pressable
                  style={styles.askCoachBtn}
                  onPress={() => {
                    setSelectedModuleId(null);
                    setActiveTab('chat');
                    handleChatSend(`Tell me more about "${selectedModule.title}": ${selectedModule.desc}`);
                  }}
                >
                  <Ionicons name="sparkles" size={16} color="#1A6B3C" />
                  <Text style={styles.askCoachBtnText}>Ask AI Coach about this module</Text>
                </Pressable>

                <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
                  {selectedModule.sessionTopics.map((topic, i) => {
                    const progress = activeMemberId
                      ? coachingProgress[sessionKey(activeMemberId, selectedModule.id, topic.id)]
                      : undefined;
                    const isComplete = !!progress?.completedAt;
                    return (
                      <Pressable
                        key={topic.id}
                        style={styles.sessionRow}
                        onPress={() => openSession(selectedModule.id, topic.id)}
                      >
                        <View
                          style={[
                            styles.sessionCheck,
                            isComplete && { backgroundColor: selectedModule.color, borderColor: selectedModule.color },
                          ]}
                        >
                          {isComplete && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sessionRowTitle}>{`${i + 1}. ${topic.title}`}</Text>
                          {isComplete && <Text style={styles.sessionRowDone}>Completed</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  {!activeMemberId ? (
                    <View style={styles.sessionLoading}>
                      <Text style={styles.sessionLoadingText}>No active profile — switch profiles and try again.</Text>
                    </View>
                  ) : sessionGenerating || !selectedSessionProgress?.content ? (
                    <View style={styles.sessionLoading}>
                      <ActivityIndicator size="small" color="#1A6B3C" />
                      <Text style={styles.sessionLoadingText}>Generating your lesson…</Text>
                    </View>
                  ) : (
                    <Text style={styles.sessionContent}>{selectedSessionProgress.content}</Text>
                  )}
                </ScrollView>

                {selectedSessionId && !sessionGenerating && selectedSessionProgress?.content && activeMemberId && (
                  <View style={styles.sessionCompleteBar}>
                    <Pressable
                      style={[
                        styles.sessionCompleteBtn,
                        selectedSessionProgress?.completedAt && styles.sessionCompleteBtnDone,
                      ]}
                      onPress={() =>
                        selectedSessionProgress?.completedAt
                          ? markIncomplete(activeMemberId, selectedModule.id, selectedSessionId)
                          : markComplete(activeMemberId, selectedModule.id, selectedSessionId)
                      }
                    >
                      <Ionicons
                        name={selectedSessionProgress?.completedAt ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.sessionCompleteBtnText}>
                        {selectedSessionProgress?.completedAt ? 'Completed' : 'Mark Complete'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#27AE60' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#27AE60' },
  content: { padding: 16 },
  moduleCard: { marginBottom: 12, borderRadius: 14 },
  moduleHeader: { flexDirection: 'row', marginBottom: 6 },
  moduleIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  moduleDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  moduleFooter: { flexDirection: 'row', alignItems: 'center' },
  moduleProg: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  tipCard: { borderRadius: 16, marginBottom: 16 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  tipIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipCategory: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tipText: { fontSize: 15, color: colors.text, lineHeight: 24, fontStyle: 'italic', marginBottom: 16 },
  tipNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  tipNavBtn: { padding: 8 },
  tipCounter: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  adviceCard: { marginBottom: 12, borderRadius: 14 },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  childAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  childInitial: { fontSize: 20, fontWeight: '800' },
  childName: { fontSize: 16, fontWeight: '700', color: colors.text },
  ageRange: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  adviceTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  adviceTipText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  /* chat tab */
  chatEmpty: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  chatEmptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  chatEmptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  chatStarter: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5EE', borderRadius: 12, padding: 14, marginBottom: 8, width: '100%' },
  chatStarterText: { flex: 1, fontSize: 14, color: '#1A6B3C', fontWeight: '500' },
  chatBubble: { borderRadius: 16, padding: 12, marginBottom: 10, maxWidth: '85%' },
  chatBubbleUser: { backgroundColor: '#1A6B3C', alignSelf: 'flex-end' },
  chatBubbleAI: { backgroundColor: colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  chatBubbleUserText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  chatBubbleAIText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  chatSuggestion: { backgroundColor: '#E8F5EE', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 6, alignSelf: 'flex-start' },
  chatSuggestionText: { fontSize: 13, color: '#1A6B3C', fontWeight: '500' },
  chatPanel: { flex: 1, minHeight: 420 },
  chatInputDock: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, zIndex: 50, elevation: 50 },

  /* module + session modals */
  moduleModal: { flex: 1, backgroundColor: colors.background },
  moduleModalHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 12, gap: 12 },
  moduleModalTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  moduleModalDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
  moduleModalClose: { padding: 6, backgroundColor: colors.card, borderRadius: 16 },
  askCoachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#E8F5EE', marginHorizontal: 16, borderRadius: 12, paddingVertical: 12 },
  askCoachBtnText: { fontSize: 13, fontWeight: '700', color: '#1A6B3C' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  sessionCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sessionRowTitle: { fontSize: 14, color: colors.text, fontWeight: '600' },
  sessionRowDone: { fontSize: 11, color: colors.success, marginTop: 2, fontWeight: '600' },
  sessionLoading: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  sessionLoadingText: { fontSize: 13, color: colors.textSecondary },
  sessionContent: { fontSize: 15, color: colors.text, lineHeight: 24 },
  sessionCompleteBar: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  sessionCompleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1A6B3C', borderRadius: 14, paddingVertical: 14 },
  sessionCompleteBtnDone: { backgroundColor: colors.success },
  sessionCompleteBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
