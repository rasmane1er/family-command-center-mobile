import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import { useReadingStore, ReadingStatus, Book } from '../../store/useReadingStore';

const STATUS_CONFIG: Record<ReadingStatus, { color: string; label: string; icon: string }> = {
  'want-to-read': { color: '#95A5A6', label: 'Want to Read', icon: 'bookmark-outline' },
  'reading':      { color: '#2980B9', label: 'Reading',      icon: 'book' },
  'completed':    { color: '#27AE60', label: 'Completed',    icon: 'checkmark-circle' },
};
const STATUS_TYPES = Object.keys(STATUS_CONFIG) as ReadingStatus[];

const COVER_EMOJIS = ['📚', '🔴', '🔵', '🟡', '🟢'];

const MEMBERS = [
  { id: 'member-1', name: 'Dad',  color: '#2980B9' },
  { id: 'member-2', name: 'Mom',  color: '#8E44AD' },
  { id: 'member-3', name: 'Emma', color: '#27AE60' },
  { id: 'member-4', name: 'Liam', color: '#F5A623' },
];

function StarRating({ rating, onRate, size = 18 }: { rating: number; onRate?: (r: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable accessibilityRole="button" key={star} onPress={() => onRate && onRate(star)} disabled={!onRate}>
          <Ionicons
            name={star <= rating ? ('star' as any) : ('star-outline' as any)}
            size={size}
            color={star <= rating ? '#FFD700' : colors.textMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

function ProgressRing({ pct, size, color }: { pct: number; size: number; color: string }) {
  const clamped = Math.min(Math.max(pct, 0), 1);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: color, borderRightColor: clamped > 0.75 ? color : 'transparent', borderBottomColor: clamped > 0.5 ? color : 'transparent', borderLeftColor: clamped > 0.25 ? color : 'transparent' }} />
        <Text style={{ fontSize: 14, fontWeight: '800', color }}>{Math.round(clamped * 100)}%</Text>
      </View>
    </View>
  );
}

function BookCard({ book, onDelete, onUpdatePages, onComplete }: {
  book: Book;
  onDelete: () => void;
  onUpdatePages?: () => void;
  onComplete?: () => void;
}) {
  const status = STATUS_CONFIG[book.status];
  const pct = book.totalPages > 0 ? book.currentPage / book.totalPages : 0;
  return (
    <View style={[styles.bookCard, shadows.sm]}>
      <View style={styles.bookRow}>
        <Text style={styles.coverEmoji}>{book.coverEmoji}</Text>
        <View style={styles.bookInfo}>
          <View style={styles.bookTitleRow}>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            <Pressable accessibilityRole="button" onPress={onDelete} style={styles.deleteBtn}>
              <Ionicons name={'trash-outline' as any} size={16} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          <View style={styles.bookMeta}>
            <View style={[styles.statusPill, { backgroundColor: status.color + '20' }]}>
              <Ionicons name={status.icon as any} size={12} color={status.color} />
              <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
            </View>
            {book.genre ? (
              <View style={styles.genrePill}>
                <Text style={styles.genrePillText}>{book.genre}</Text>
              </View>
            ) : null}
          </View>
          {book.status === 'reading' && (
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{book.currentPage} / {book.totalPages} pages</Text>
                <Text style={styles.progressPct}>{Math.round(pct * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: '#2980B9' }]} />
              </View>
              <View style={styles.bookActions}>
                {onUpdatePages && (
                  <Pressable accessibilityRole="button" style={styles.actionBtn} onPress={onUpdatePages}>
                    <Ionicons name={'pencil' as any} size={13} color="#2980B9" />
                    <Text style={[styles.actionBtnText, { color: '#2980B9' }]}>Update pages</Text>
                  </Pressable>
                )}
                {onComplete && (
                  <Pressable accessibilityRole="button" style={[styles.actionBtn, styles.actionBtnGreen]} onPress={onComplete}>
                    <Ionicons name={'checkmark-circle' as any} size={13} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Mark complete</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          {book.status === 'completed' && book.rating > 0 && (
            <View style={styles.ratingRow}>
              <StarRating rating={book.rating} size={14} />
              {book.finishDate && <Text style={styles.finishDate}>Finished {book.finishDate}</Text>}
            </View>
          )}
          {book.notes ? <Text style={styles.bookNotes}>{book.notes}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export function ReadingTrackerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const {
    books,
    challenges,
    addBook,
    updateProgress,
    completeBook,
    removeBook,
    addChallenge,
    getBooksForMember,
    getCompletedCount,
    getTotalPagesRead,
  } = useReadingStore();

  const [activeTab, setActiveTab] = useState<'bookshelf' | 'progress' | 'challenges'>('bookshelf');
  const [selectedMemberId, setSelectedMemberId] = useState('member-3');
  const [showAddBook, setShowAddBook] = useState(false);
  const [showUpdatePages, setShowUpdatePages] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');

  // Add Book modal state
  const [bTitle, setBTitle] = useState('');
  const [bAuthor, setBAuthor] = useState('');
  const [bPages, setBPages] = useState('');
  const [bGenre, setBGenre] = useState('');
  const [bStatus, setBStatus] = useState<ReadingStatus>('want-to-read');
  const [bEmoji, setBEmoji] = useState('📚');
  const [bMemberId, setBMemberId] = useState('member-3');
  const [bNotes, setBNotes] = useState('');

  // Update pages modal
  const [newPage, setNewPage] = useState('');

  // Complete modal
  const [starRating, setStarRating] = useState(5);

  const openAddBook = () => {
    setBTitle(''); setBAuthor(''); setBPages(''); setBGenre(''); setBStatus('want-to-read');
    setBEmoji('📚'); setBMemberId(selectedMemberId); setBNotes('');
    setShowAddBook(true);
  };

  const handleAddBook = () => {
    if (!bTitle.trim()) { Alert.alert('Missing Info', 'Please enter a title.'); return; }
    const pages = parseInt(bPages);
    if (!pages || pages <= 0) { Alert.alert('Missing Info', 'Please enter valid page count.'); return; }
    const mem = MEMBERS.find((m) => m.id === bMemberId)!;
    addBook({
      memberId: bMemberId,
      memberName: mem.name,
      title: bTitle.trim(),
      author: bAuthor.trim(),
      totalPages: pages,
      currentPage: 0,
      status: bStatus,
      rating: 0,
      genre: bGenre.trim(),
      notes: bNotes.trim(),
      coverEmoji: bEmoji,
      startDate: bStatus === 'reading' ? new Date().toISOString().split('T')[0] : undefined,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddBook(false);
  };

  const openUpdatePages = (bookId: string) => {
    const b = books.find((x) => x.id === bookId);
    setSelectedBookId(bookId);
    setNewPage(b ? String(b.currentPage) : '0');
    setShowUpdatePages(true);
  };

  const handleUpdatePages = () => {
    const page = parseInt(newPage);
    if (isNaN(page) || page < 0) { Alert.alert('Invalid', 'Enter a valid page number.'); return; }
    updateProgress(selectedBookId, page);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowUpdatePages(false);
  };

  const openComplete = (bookId: string) => {
    setSelectedBookId(bookId);
    setStarRating(5);
    setShowComplete(true);
  };

  const handleComplete = () => {
    completeBook(selectedBookId, starRating);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowComplete(false);
  };

  const memberBooks = getBooksForMember(selectedMemberId);
  const currentlyReading = books.filter((b) => b.status === 'reading');
  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={['#4A148C', '#6A1B9A']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name={'arrow-back' as any} size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Reading Tracker</Text>
          <Text style={styles.headerSubtitle}>Books & reading goals</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['bookshelf', 'progress', 'challenges'] as const).map((tab) => (
          <Pressable accessibilityRole="button"
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* BOOKSHELF TAB */}
        {activeTab === 'bookshelf' && (
          <>
            {/* Member tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll} contentContainerStyle={styles.memberScrollContent}>
              {MEMBERS.map((m) => (
                <Pressable accessibilityRole="button"
                  key={m.id}
                  style={[styles.memberChip, selectedMemberId === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                  onPress={() => setSelectedMemberId(m.id)}
                >
                  <Text style={[styles.memberChipText, selectedMemberId === m.id && { color: '#fff' }]}>{m.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Stats row */}
            {(() => {
              const completed = getCompletedCount(selectedMemberId, currentYear);
              const pagesRead = getTotalPagesRead(selectedMemberId);
              const reading = getBooksForMember(selectedMemberId).filter((b) => b.status === 'reading').length;
              return (
                <View style={[styles.statsRow, shadows.sm]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#27AE60' }]}>{completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#2980B9' }]}>{reading}</Text>
                    <Text style={styles.statLabel}>Reading</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#8E44AD' }]}>{pagesRead.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Pages Read</Text>
                  </View>
                </View>
              );
            })()}

            {memberBooks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📚</Text>
                <Text style={styles.emptyTitle}>No Books Yet</Text>
                <Text style={styles.emptySubtitle}>Tap + to add your first book</Text>
              </View>
            ) : (
              memberBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onDelete={() => removeBook(book.id)}
                  onUpdatePages={book.status === 'reading' ? () => openUpdatePages(book.id) : undefined}
                  onComplete={book.status === 'reading' ? () => openComplete(book.id) : undefined}
                />
              ))
            )}
            <View style={{ height: 120 }} />
          </>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <>
            <Text style={styles.sectionHeader}>Currently Reading</Text>
            {currentlyReading.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📖</Text>
                <Text style={styles.emptyTitle}>Nobody Reading Right Now</Text>
                <Text style={styles.emptySubtitle}>Start a book from the Bookshelf tab</Text>
              </View>
            ) : (
              currentlyReading.map((book) => {
                const mem = MEMBERS.find((m) => m.id === book.memberId);
                const pct = book.totalPages > 0 ? book.currentPage / book.totalPages : 0;
                const pagesLeft = Math.max(0, book.totalPages - book.currentPage);
                return (
                  <View key={book.id} style={[styles.progressCard, shadows.sm]}>
                    <View style={styles.progressCardHeader}>
                      <Text style={styles.coverEmojiLg}>{book.coverEmoji}</Text>
                      <View style={styles.progressCardInfo}>
                        <Text style={styles.bookTitle}>{book.title}</Text>
                        <Text style={styles.bookAuthor}>{book.author}</Text>
                        {mem && (
                          <View style={[styles.statusPill, { backgroundColor: (mem.color) + '20', alignSelf: 'flex-start', marginTop: 4 }]}>
                            <Text style={[styles.statusPillText, { color: mem.color }]}>{mem.name}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressText}>{book.currentPage} / {book.totalPages} pages</Text>
                      <Text style={[styles.progressPct, { color: mem?.color ?? '#2980B9' }]}>{Math.round(pct * 100)}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: mem?.color ?? '#2980B9' }]} />
                    </View>
                    <Text style={styles.pagesLeftText}>{pagesLeft} pages left</Text>
                    <View style={styles.bookActions}>
                      <Pressable accessibilityRole="button" style={styles.actionBtn} onPress={() => openUpdatePages(book.id)}>
                        <Ionicons name={'pencil' as any} size={13} color="#2980B9" />
                        <Text style={[styles.actionBtnText, { color: '#2980B9' }]}>Update pages</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => openComplete(book.id)}>
                        <Ionicons name={'checkmark-circle' as any} size={13} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>Mark complete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </>
        )}

        {/* CHALLENGES TAB */}
        {activeTab === 'challenges' && (
          <>
            <Text style={styles.sectionHeader}>Reading Challenges {currentYear}</Text>
            {challenges.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyTitle}>No Challenges Yet</Text>
                <Text style={styles.emptySubtitle}>Set a yearly reading goal for family members</Text>
              </View>
            ) : (
              challenges.map((ch) => {
                const mem = MEMBERS.find((m) => m.id === ch.memberId);
                const completed = getCompletedCount(ch.memberId, ch.year);
                const pct = ch.targetBooks > 0 ? Math.min(completed / ch.targetBooks, 1) : 0;
                return (
                  <View key={ch.id} style={[styles.challengeCard, shadows.sm]}>
                    <View style={styles.challengeRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.challengeHeader}>
                          {mem && (
                            <View style={[styles.memberAvatarSm, { backgroundColor: mem.color }]}>
                              <Text style={styles.memberAvatarSmText}>{mem.name[0]}</Text>
                            </View>
                          )}
                          <View>
                            <Text style={styles.challengeName}>{ch.memberName}</Text>
                            <Text style={styles.challengeYear}>{ch.year} Challenge</Text>
                          </View>
                        </View>
                        <View style={styles.challengeStats}>
                          <Text style={[styles.challengeCount, { color: mem?.color ?? '#8E44AD' }]}>
                            {completed} / {ch.targetBooks}
                          </Text>
                          <Text style={styles.challengeLabel}>books read</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: mem?.color ?? '#8E44AD' }]} />
                        </View>
                        <Text style={styles.challengeRemaining}>
                          {Math.max(0, ch.targetBooks - completed)} books to go
                        </Text>
                      </View>
                      <ProgressRing pct={pct} size={72} color={mem?.color ?? '#8E44AD'} />
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable accessibilityRole="button" style={[styles.fab, { bottom: tabBarInset }]} onPress={openAddBook}>
        <LinearGradient colors={['#6A1B9A', '#4A148C']} style={styles.fabGradient}>
          <Ionicons name={'add' as any} size={32} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add Book Modal */}
      <Modal visible={showAddBook} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddBook(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Book</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowAddBook(false)}>
                <Ionicons name={'close' as any} size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              <Text style={styles.fieldLabel}>Member</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MEMBERS.map((m) => (
                  <Pressable accessibilityRole="button"
                    key={m.id}
                    style={[styles.chipBtn, bMemberId === m.id && { backgroundColor: m.color, borderColor: m.color }]}
                    onPress={() => setBMemberId(m.id)}
                  >
                    <Text style={[styles.chipBtnText, bMemberId === m.id && { color: '#fff' }]}>{m.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Cover Emoji</Text>
              <View style={styles.emojiRow}>
                {COVER_EMOJIS.map((e) => (
                  <Pressable accessibilityRole="button"
                    key={e}
                    style={[styles.emojiBtn, bEmoji === e && styles.emojiBtnActive]}
                    onPress={() => setBEmoji(e)}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput accessibilityLabel="Book title" style={styles.textInput} value={bTitle} onChangeText={setBTitle} placeholder="Book title" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Author</Text>
              <TextInput accessibilityLabel="Author name" style={styles.textInput} value={bAuthor} onChangeText={setBAuthor} placeholder="Author name" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Total Pages *</Text>
              <TextInput accessibilityLabel="300" style={styles.textInput} value={bPages} onChangeText={setBPages} placeholder="300" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

              <Text style={styles.fieldLabel}>Genre</Text>
              <TextInput accessibilityLabel="e.g. Fantasy, Fiction" style={styles.textInput} value={bGenre} onChangeText={setBGenre} placeholder="e.g. Fantasy, Fiction" placeholderTextColor={colors.textMuted} />

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.chipRow}>
                {STATUS_TYPES.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <Pressable accessibilityRole="button"
                      key={s}
                      style={[styles.chipBtn, bStatus === s && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                      onPress={() => setBStatus(s)}
                    >
                      <Ionicons name={cfg.icon as any} size={13} color={bStatus === s ? '#fff' : cfg.color} />
                      <Text style={[styles.chipBtnText, bStatus === s && { color: '#fff' }]}>{cfg.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput accessibilityLabel="Why you want to read this, recommendations..." style={[styles.textInput, styles.textInputMultiline]} value={bNotes} onChangeText={setBNotes} placeholder="Why you want to read this, recommendations..." placeholderTextColor={colors.textMuted} multiline />

              <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddBook}>
                <LinearGradient colors={['#6A1B9A', '#4A148C']} style={styles.saveBtnGradient}>
                  <Ionicons name={'checkmark-circle' as any} size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Add Book</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Update Pages Modal */}
      <Modal visible={showUpdatePages} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowUpdatePages(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowUpdatePages(false)}>
              <Ionicons name={'close' as any} size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.fieldLabel}>Current Page</Text>
            <TextInput accessibilityLabel="0"
              style={styles.textInput}
              value={newPage}
              onChangeText={setNewPage}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              autoFocus
            />
            <Pressable accessibilityRole="button" style={[styles.saveBtn, { marginTop: 24 }]} onPress={handleUpdatePages}>
              <LinearGradient colors={['#6A1B9A', '#4A148C']} style={styles.saveBtnGradient}>
                <Ionicons name={'checkmark-circle' as any} size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Update Pages</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Mark Complete Modal */}
      <Modal visible={showComplete} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowComplete(false)}>
        <View style={styles.modalContainer}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mark as Complete</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowComplete(false)}>
              <Ionicons name={'close' as any} size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.fieldLabel}>Rate this book</Text>
            <View style={styles.starPickerRow}>
              <StarRating rating={starRating} onRate={setStarRating} size={36} />
            </View>
            <Text style={styles.ratingHint}>
              {starRating === 1 ? 'Not for me' : starRating === 2 ? 'Okay' : starRating === 3 ? 'Good' : starRating === 4 ? 'Really liked it' : 'Amazing!'}
            </Text>
            <Pressable accessibilityRole="button" style={[styles.saveBtn, { marginTop: 24 }]} onPress={handleComplete}>
              <LinearGradient colors={['#27AE60', '#1ABC9C']} style={styles.saveBtnGradient}>
                <Ionicons name={'checkmark-circle' as any} size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Complete Book 🎉</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
    ...shadows.sm,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#6A1B9A' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  memberScroll: { marginBottom: 12 },
  memberScrollContent: { gap: 8, paddingRight: 8 },
  memberChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 4,
  },
  memberChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  bookCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  bookRow: { flexDirection: 'row', gap: 12 },
  coverEmoji: { fontSize: 32, lineHeight: 40 },
  coverEmojiLg: { fontSize: 40, lineHeight: 50 },
  bookInfo: { flex: 1 },
  bookTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bookTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  bookAuthor: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bookMeta: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  genrePill: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  genrePillText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  progressSection: { marginTop: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, color: colors.textSecondary },
  progressPct: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  bookActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2980B9',
  },
  actionBtnGreen: { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  finishDate: { fontSize: 11, color: colors.textMuted },
  bookNotes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 6 },
  deleteBtn: { padding: 2 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 4 },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  progressCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  progressCardInfo: { flex: 1 },
  pagesLeftText: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  challengeCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  challengeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  memberAvatarSm: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  memberAvatarSmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  challengeName: { fontSize: 15, fontWeight: '700', color: colors.text },
  challengeYear: { fontSize: 12, color: colors.textSecondary },
  challengeStats: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 },
  challengeCount: { fontSize: 24, fontWeight: '800' },
  challengeLabel: { fontSize: 13, color: colors.textSecondary },
  challengeRemaining: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.md,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalContainer: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 60 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emojiRow: { flexDirection: 'row', gap: 10 },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  emojiBtnActive: { borderColor: '#6A1B9A', backgroundColor: '#6A1B9A20' },
  emojiText: { fontSize: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 8,
    marginBottom: 4,
  },
  chipBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  textInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  starPickerRow: { alignItems: 'center', paddingVertical: 16 },
  ratingHint: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 4 },
});
