import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Alert, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useConnectStore } from '../../store/useConnectStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { ConnectionRelationshipType, HouseholdConnection, ConnectPost, PostComment } from '../../types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Comments don't carry an avatarColor the way a FamilyMember does (the
// author may belong to any connected household, not just ours) — this
// picks a stable color per author id instead of everyone defaulting to the
// same one, same palette Avatar itself falls back to.
function avatarColorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return colors.avatars[Math.abs(hash) % colors.avatars.length];
}

const RELATIONSHIP_TYPES: { value: ConnectionRelationshipType; label: string; icon: string }[] = [
  { value: 'RELATIVE', label: 'Relative', icon: 'people' },
  { value: 'FRIEND', label: 'Friend', icon: 'happy' },
  { value: 'NEIGHBOR', label: 'Neighbor', icon: 'home' },
  { value: 'SCHOOL', label: 'School', icon: 'school' },
  { value: 'MILITARY', label: 'Military', icon: 'shield' },
  { value: 'CHURCH', label: 'Church', icon: 'business' },
  { value: 'SPORTS', label: 'Sports', icon: 'football' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

interface FeedPostCardProps {
  post: ConnectPost;
  isOwn: boolean;
  reactionCount: number;
  commentCount: number;
  hasMyReaction: boolean;
  isExpanded: boolean;
  comments: PostComment[];
  commentDraft: string;
  onDeletePost: (post: ConnectPost) => void;
  onReportPost: (post: ConnectPost) => void;
  onToggleReaction: (postId: string) => void;
  onExpandPost: (post: ConnectPost) => void;
  onCommentDraftChange: (text: string) => void;
  onAddComment: (postId: string) => void;
}

// Memoized so typing a comment on one post (which changes commentDraft on
// every keystroke) doesn't re-render every other post card in the feed —
// only the currently-expanded post's props actually change.
const FeedPostCard = React.memo(function FeedPostCard({
  post, isOwn, reactionCount, commentCount, hasMyReaction, isExpanded, comments, commentDraft,
  onDeletePost, onReportPost, onToggleReaction, onExpandPost, onCommentDraftChange, onAddComment,
}: FeedPostCardProps) {
  return (
    <Card style={styles.rowCard} variant="elevated">
      <View style={styles.rowTop}>
        <View style={styles.familyIcon}>
          <Ionicons name="home" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.familyName}>{post.family?.name ?? 'Household'}</Text>
          <Text style={styles.relationshipLabel}>{timeAgo(post.createdAt)}</Text>
        </View>
        {isOwn ? (
          <Pressable onPress={() => onDeletePost(post)}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        ) : (
          <Pressable onPress={() => onReportPost(post)}>
            <Ionicons name="flag-outline" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {!!post.text && <Text style={styles.postText}>{post.text}</Text>}

      <View style={styles.postActions}>
        <Pressable onPress={() => onToggleReaction(post.id)} style={styles.postActionBtn}>
          <Ionicons name={hasMyReaction ? 'heart' : 'heart-outline'} size={16} color={hasMyReaction ? colors.danger : colors.textSecondary} />
          <Text style={styles.postActionText}>{reactionCount > 0 ? reactionCount : 'Like'}</Text>
        </Pressable>
        {post.commentsEnabled && (
          <Pressable onPress={() => onExpandPost(post)} style={styles.postActionBtn}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.postActionText}>{commentCount > 0 ? commentCount : 'Comment'}</Text>
          </Pressable>
        )}
      </View>

      {isExpanded && (
        <View style={styles.commentsSection}>
          {comments.map((c) => {
            const authorLabel = c.authorName ?? 'A family member';
            return (
              <View key={c.id} style={styles.commentRow}>
                <Avatar name={authorLabel} color={avatarColorForId(c.authorMemberId)} size={30} />
                <View style={styles.commentBody}>
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthorLine}>
                      <Text style={styles.commentAuthor}>{authorLabel}</Text>
                      {c.authorFamilyName && (
                        <Text style={styles.commentFamily}> · {c.authorFamilyName}</Text>
                      )}
                    </Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
              </View>
            );
          })}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment…"
              placeholderTextColor={colors.textMuted}
              value={commentDraft}
              onChangeText={onCommentDraftChange}
            />
            <Pressable onPress={() => onAddComment(post.id)} style={styles.commentSendBtn}>
              <Ionicons name="send" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      )}
    </Card>
  );
});

export function FamilyConnectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'feed' | 'connections' | 'incoming' | 'outgoing'>('feed');
  const [showSendModal, setShowSendModal] = useState(false);
  const [email, setEmail] = useState('');
  const [relationshipType, setRelationshipType] = useState<ConnectionRelationshipType>('RELATIVE');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const connections = useConnectStore((s) => s.connections);
  const incomingRequests = useConnectStore((s) => s.incomingRequests);
  const outgoingRequests = useConnectStore((s) => s.outgoingRequests);
  const fetchFromServer = useConnectStore((s) => s.fetchFromServer);
  const sendConnectionRequest = useConnectStore((s) => s.sendConnectionRequest);
  const acceptRequest = useConnectStore((s) => s.acceptRequest);
  const acceptRequestLimited = useConnectStore((s) => s.acceptRequestLimited);
  const declineRequest = useConnectStore((s) => s.declineRequest);
  const removeConnection = useConnectStore((s) => s.removeConnection);
  const blockHousehold = useConnectStore((s) => s.blockHousehold);
  const feedPosts = useConnectStore((s) => s.feedPosts);
  const postComments = useConnectStore((s) => s.postComments);
  const postReactions = useConnectStore((s) => s.postReactions);
  const fetchFeed = useConnectStore((s) => s.fetchFeed);
  const createPost = useConnectStore((s) => s.createPost);
  const deletePost = useConnectStore((s) => s.deletePost);
  const loadPostComments = useConnectStore((s) => s.loadPostComments);
  const addComment = useConnectStore((s) => s.addComment);
  const toggleReaction = useConnectStore((s) => s.toggleReaction);
  const reportPost = useConnectStore((s) => s.reportPost);

  const familyId = useFamilyStore((s) => s.family?.id);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  useEffect(() => {
    fetchFromServer();
    fetchFeed();
  }, [fetchFromServer, fetchFeed]);

  const handlePost = async () => {
    if (!composeText.trim() || !activeMemberId) return;
    setPosting(true);
    const result = await createPost(activeMemberId, composeText.trim());
    setPosting(false);
    if (result.success) {
      setComposeText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Could not post', result.error);
    }
  };

  const handleExpandPost = useCallback((post: ConnectPost) => {
    setExpandedPostId((prev) => (prev === post.id ? null : post.id));
    if (!postComments[post.id]) loadPostComments(post.id);
  }, [postComments, loadPostComments]);

  const handleAddComment = useCallback((postId: string) => {
    if (!commentDraft.trim() || !activeMemberId) return;
    addComment(postId, activeMemberId, commentDraft.trim());
    setCommentDraft('');
  }, [commentDraft, activeMemberId, addComment]);

  const handleToggleReaction = useCallback((postId: string) => {
    if (!activeMemberId) return;
    toggleReaction(postId, activeMemberId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [activeMemberId, toggleReaction]);

  const handleDeletePost = useCallback((post: ConnectPost) => {
    Alert.alert('Delete post?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePost(post.id) },
    ]);
  }, [deletePost]);

  const handleReportPost = useCallback((post: ConnectPost) => {
    if (!activeMemberId) return;
    Alert.alert('Report this post?', 'Our team will review it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => { reportPost(post.id, activeMemberId, 'OTHER'); Alert.alert('Reported', 'Thanks — we\'ll take a look.'); } },
    ]);
  }, [activeMemberId, reportPost]);

  const renderFeedItem = useCallback(({ item: post }: { item: ConnectPost }) => {
    const isOwn = post.familyId === familyId;
    const reactionCount = post._count?.reactions ?? 0;
    const commentCount = post._count?.comments ?? 0;
    const hasMyReaction = !!(postReactions[post.id] ?? []).find((r) => r.authorMemberId === activeMemberId);
    const isExpanded = expandedPostId === post.id;
    return (
      <FeedPostCard
        post={post}
        isOwn={isOwn}
        reactionCount={reactionCount}
        commentCount={commentCount}
        hasMyReaction={hasMyReaction}
        isExpanded={isExpanded}
        comments={postComments[post.id] ?? []}
        commentDraft={isExpanded ? commentDraft : ''}
        onDeletePost={handleDeletePost}
        onReportPost={handleReportPost}
        onToggleReaction={handleToggleReaction}
        onExpandPost={handleExpandPost}
        onCommentDraftChange={setCommentDraft}
        onAddComment={handleAddComment}
      />
    );
  }, [
    familyId, postReactions, activeMemberId, expandedPostId, postComments, commentDraft,
    handleDeletePost, handleReportPost, handleToggleReaction, handleExpandPost, handleAddComment,
  ]);

  const handleSendRequest = async () => {
    if (!email.trim()) return;
    setSending(true);
    const result = await sendConnectionRequest(email.trim().toLowerCase(), relationshipType, message.trim() || undefined);
    setSending(false);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEmail('');
      setMessage('');
      setRelationshipType('RELATIVE');
      setShowSendModal(false);
      Alert.alert('Request sent', 'They\'ll see it the next time they open the app.');
    } else {
      Alert.alert('Could not send request', result.error);
    }
  };

  const handleAccept = (id: string) => {
    acceptRequest(id).then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  };

  const handleAcceptLimited = (id: string) => {
    Alert.alert(
      'Accept with limited access?',
      'They\'ll be able to message and see events, but not children\'s info, photos, or your location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept Limited', onPress: () => acceptRequestLimited(id).then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)) },
      ]
    );
  };

  const handleDecline = (id: string) => {
    Alert.alert('Decline request?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => declineRequest(id) },
    ]);
  };

  const handleRemove = (connection: HouseholdConnection) => {
    const otherName = connection.requesterFamily?.name ?? connection.recipientFamily?.name ?? 'this household';
    Alert.alert('Remove connection?', `You'll no longer be connected with ${otherName}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeConnection(connection.id) },
    ]);
  };

  const handleBlock = (connection: HouseholdConnection) => {
    const otherFamilyId = connection.requesterFamily ? connection.requesterFamilyId : connection.recipientFamilyId;
    const otherName = connection.requesterFamily?.name ?? connection.recipientFamily?.name ?? 'this household';
    Alert.alert('Block household?', `${otherName} won't be able to send you requests or messages.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => blockHousehold(otherFamilyId) },
    ]);
  };

  const screenHeader = (
    <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Family Connect</Text>
        <Pressable onPress={() => setShowSendModal(true)} style={styles.addBtn}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </Pressable>
      </View>
      <Text style={styles.headerSubtitle}>Trusted households. Not a social network.</Text>

      <View style={styles.tabs}>
        {([
          { key: 'feed', label: 'Feed', count: 0 },
          { key: 'connections', label: 'Connected', count: connections.length },
          { key: 'incoming', label: 'Incoming', count: incomingRequests.length },
          { key: 'outgoing', label: 'Sent', count: outgoingRequests.length },
        ] as const).map((tab) => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tab, activeTab === tab.key && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#0F2952', '#1E4A8A']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Family Connect</Text>
      <Pressable onPress={() => setShowSendModal(true)} style={styles.addBtn}>
        <Ionicons name="person-add" size={18} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => {
          const scrollProps = {
            onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle,
            contentContainerStyle: [styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }],
          };

          if (activeTab === 'feed') {
            return (
              <FlatList
                {...scrollProps}
                data={feedPosts}
                keyExtractor={(post) => post.id}
                ListHeaderComponent={
                  <Card style={styles.composeCard} variant="elevated">
                    <TextInput
                      style={styles.composeInput}
                      placeholder="Share an update with your connected households…"
                      placeholderTextColor={colors.textMuted}
                      value={composeText}
                      onChangeText={setComposeText}
                      multiline
                    />
                    <Button title="Post" onPress={handlePost} loading={posting} disabled={!composeText.trim()} size="sm" style={{ alignSelf: 'flex-end' }} />
                  </Card>
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No posts yet</Text>
                    <Text style={styles.emptyDesc}>Share an update — it'll only be visible to households you're connected with.</Text>
                  </View>
                }
                renderItem={renderFeedItem}
              />
            );
          }

          if (activeTab === 'connections') {
            return (
              <FlatList
                {...scrollProps}
                data={connections}
                keyExtractor={(c) => c.id}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={56} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No connected households yet</Text>
                    <Text style={styles.emptyDesc}>Connect with grandparents, relatives, or trusted friends — each keeps their own household, just linked to yours.</Text>
                    <Button title="Connect a Household" onPress={() => setShowSendModal(true)} style={{ marginTop: 18 }} />
                  </View>
                }
                renderItem={({ item: c }) => {
                  const other = c.requesterFamily ?? c.recipientFamily;
                  return (
                    <Card style={styles.rowCard} variant="elevated">
                      <View style={styles.rowTop}>
                        <View style={styles.familyIcon}>
                          <Ionicons name="home" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.familyName}>{other?.name ?? 'Household'}</Text>
                          <Text style={styles.relationshipLabel}>
                            {RELATIONSHIP_TYPES.find((r) => r.value === c.relationshipType)?.label ?? 'Other'}
                          </Text>
                        </View>
                        {c.status === 'LIMITED' && <Badge label="Limited" variant="warning" size="sm" />}
                      </View>
                      <View style={styles.rowActions}>
                        <Pressable onPress={() => handleRemove(c)} style={styles.actionBtn}>
                          <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
                          <Text style={styles.actionBtnText}>Remove</Text>
                        </Pressable>
                        <Pressable onPress={() => handleBlock(c)} style={styles.actionBtn}>
                          <Ionicons name="ban-outline" size={16} color={colors.danger} />
                          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Block</Text>
                        </Pressable>
                      </View>
                    </Card>
                  );
                }}
              />
            );
          }

          if (activeTab === 'incoming') {
            return (
              <FlatList
                {...scrollProps}
                data={incomingRequests}
                keyExtractor={(r) => r.id}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="mail-open-outline" size={56} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No incoming requests</Text>
                  </View>
                }
                renderItem={({ item: r }) => (
                  <Card style={styles.rowCard} variant="elevated">
                    <View style={styles.rowTop}>
                      <View style={styles.familyIcon}>
                        <Ionicons name="home" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.familyName}>{r.requesterFamily?.name ?? 'Household'}</Text>
                        <Text style={styles.relationshipLabel}>
                          {RELATIONSHIP_TYPES.find((rt) => rt.value === r.relationshipType)?.label ?? 'Other'}
                        </Text>
                        {r.message && <Text style={styles.messagePreview}>"{r.message}"</Text>}
                      </View>
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable onPress={() => handleAccept(r.id)} style={[styles.actionBtn, styles.acceptBtn]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept</Text>
                      </Pressable>
                      <Pressable onPress={() => handleAcceptLimited(r.id)} style={styles.actionBtn}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.actionBtnText}>Limited</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDecline(r.id)} style={styles.actionBtn}>
                        <Ionicons name="close" size={16} color={colors.danger} />
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>Decline</Text>
                      </Pressable>
                    </View>
                  </Card>
                )}
              />
            );
          }

          return (
            <FlatList
              {...scrollProps}
              data={outgoingRequests}
              keyExtractor={(r) => r.id}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="paper-plane-outline" size={56} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No pending requests sent</Text>
                </View>
              }
              renderItem={({ item: r }) => (
                <Card style={styles.rowCard} variant="elevated">
                  <View style={styles.rowTop}>
                    <View style={styles.familyIcon}>
                      <Ionicons name="home" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.familyName}>{r.recipientFamily?.name ?? 'Household'}</Text>
                      <Text style={styles.relationshipLabel}>Waiting for response…</Text>
                    </View>
                    <Badge label="Pending" variant="neutral" size="sm" />
                  </View>
                </Card>
              )}
            />
          );
        }}
      </CollapsibleHeader>

      <Modal visible={showSendModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSendModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Connect a Household</Text>
          <Text style={styles.modalSubtitle}>
            Enter the email address the other household signed up with. They'll get a request to accept.
          </Text>

          <Text style={styles.modalLabel}>Email Address</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="grandma@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Relationship</Text>
          <View style={styles.chipRow}>
            {RELATIONSHIP_TYPES.map((rt) => (
              <Pressable
                key={rt.value}
                onPress={() => setRelationshipType(rt.value)}
                style={[styles.chip, relationshipType === rt.value && styles.chipActive]}
              >
                <Ionicons name={rt.icon as any} size={14} color={relationshipType === rt.value ? '#fff' : colors.textSecondary} />
                <Text style={[styles.chipText, relationshipType === rt.value && styles.chipTextActive]}>{rt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Message (optional)</Text>
          <TextInput
            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Hi! Let's connect our households on Family Command Center."
            value={message}
            onChangeText={setMessage}
            multiline
            placeholderTextColor={colors.textMuted}
          />

          <Button title="Send Request" onPress={handleSendRequest} fullWidth size="lg" loading={sending} disabled={!email.trim()} style={{ marginTop: 8 }} />
          <Button title="Cancel" onPress={() => setShowSendModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  tabTextActive: { color: colors.primary },
  content: { padding: 16 },
  rowCard: { marginBottom: 10, borderRadius: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  familyIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  familyName: { fontSize: 15, fontWeight: '700', color: colors.text },
  relationshipLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  messagePreview: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.background },
  acceptBtn: { backgroundColor: colors.success },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 19 },
  modal: { flex: 1, backgroundColor: colors.background, padding: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  composeCard: { marginBottom: 14, borderRadius: 14, gap: 10 },
  composeInput: { fontSize: 14, color: colors.text, minHeight: 44, textAlignVertical: 'top' },
  postText: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: 10 },
  postActions: { flexDirection: 'row', gap: 20, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  postActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postActionText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  commentsSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 10 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentBody: { flex: 1 },
  commentBubble: { backgroundColor: colors.background, borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  commentAuthorLine: { marginBottom: 2 },
  commentAuthor: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  commentFamily: { fontSize: 11.5, fontWeight: '500', color: colors.textSecondary },
  commentTime: { fontSize: 11, color: colors.textMuted, marginTop: 3, marginLeft: 12 },
  commentText: { fontSize: 13.5, lineHeight: 18, color: colors.text },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, fontSize: 13, color: colors.text },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '15' },
});
