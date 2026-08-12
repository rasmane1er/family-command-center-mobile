import { useAppStateInterval } from './useAppStateInterval';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { useGuardianStore } from '../store/useGuardianStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { useChildcareStore } from '../store/useChildcareStore';
import { useSchoolStore } from '../store/useSchoolStore';
import { useFamilyBoardStore } from '../store/useFamilyBoardStore';
import { useAllowanceStore } from '../store/useAllowanceStore';
import { useGiftStore } from '../store/useGiftStore';
import { useConnectStore } from '../store/useConnectStore';
import { useAuthStore } from '../store/useAuthStore';

const SCAN_INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BILL_DUE_SOON_DAYS = 3;
const SCHOOL_DUE_SOON_DAYS = 3;
const GOAL_MILESTONES = [25, 50, 75, 100];
const CHILDCARE_UPCOMING_HOURS = 24;
const ALLOWANCE_DUE_DAYS = 7;
const GIFT_BIRTHDAY_LEAD_DAYS = 14;

// Next occurrence of a member's birthday from `now` — dateOfBirth only
// carries month/day meaningfully here (the year is their birth year, not
// this year's), so this re-anchors it to whichever of this-year/next-year
// hasn't passed yet.
function nextBirthday(dateOfBirth: string, now: Date): Date | null {
  // Android's JS engine rejects some date formats (e.g. "MM/DD/YYYY") that
  // iOS accepts — normalise slashes to dashes so new Date() parses reliably.
  const normalised = dateOfBirth.replace(/\//g, '-');
  const dob = new Date(normalised);
  if (isNaN(dob.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (thisYear.getTime() >= today.getTime()) return thisYear;
  return new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
}

// Periodic scanner for real, already-existing app state — mirrors the
// pattern in useGuardianCommandPolling.ts (mount once, re-scan on an
// interval via .getState() reads rather than a reactive subscription).
// Notifications are minutes/hours-scale here, not Guardian's near-real-time
// command delivery, so a 5-minute interval is enough. Dedup is handled via
// useNotificationsStore's notifiedSourceKeys so re-scanning doesn't spam
// duplicates; keys clear when their underlying condition resolves so a
// future recurrence of the same id can notify again.
// Bookings store time as a display string ("6:00 PM"), so this mirrors the
// same parsing ChildcareManagerScreen.tsx uses for its own hours-worked
// calculation — kept local rather than imported since hooks shouldn't
// depend on a screen module.
function parseBookingStartMs(date: string, startTime: string): number | null {
  const match = startTime.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

// Family Connect (cross-household requests/feed/co-parenting) is scanned
// separately from everything else in scan() below: its data — incoming
// requests, the feed, co-parent grants — is only ever fetched today when
// the Family Connect screen itself is opened, so without an explicit
// refetch here a user who never opens that screen would never be notified
// of anything on it. This is the one section of the scanner that hits the
// network instead of just reading whatever's already in memory.
async function scanConnect(notif: ReturnType<typeof useNotificationsStore.getState>, family: ReturnType<typeof useFamilyStore.getState>) {
  const auth = useAuthStore.getState();
  await Promise.all([
    useConnectStore.getState().fetchFromServer(),
    useConnectStore.getState().fetchFeed(true),
    useConnectStore.getState().fetchCoParentGrants(),
  ]);
  const connect = useConnectStore.getState();
  const myFamilyId = family.family?.id;

  // Incoming connection requests — never resolve/clear the way a bill does;
  // once accepted/declined the request drops out of incomingRequests
  // entirely, so there's nothing left here to re-check.
  connect.incomingRequests.forEach((req) => {
    const key = `connect-request-${req.id}`;
    if (notif.hasBeenNotified(key)) return;
    notif.markNotified(key);
    notif.addNotification({
      type: 'family',
      isRead: false,
      title: '🤝 New Connection Request',
      body: `${req.requesterFamily?.name ?? 'A household'} wants to connect with your family.`,
      action: { label: 'Review', route: 'FamilyConnect' },
    });
  });

  connect.feedPosts.forEach((post) => {
    if (post.familyId !== myFamilyId) {
      // A post from a connected household — notify once per post.
      const key = `connect-post-${post.id}`;
      if (notif.hasBeenNotified(key)) return;
      notif.markNotified(key);
      notif.addNotification({
        type: 'family',
        isRead: false,
        title: '📣 New Family Connect Post',
        body: `${post.family?.name ?? 'A connected household'} shared an update.`,
        action: { label: 'View Feed', route: 'FamilyConnect' },
      });
      return;
    }
    // Your own post — notify on comment/reaction count increases. The key
    // encodes the count itself rather than just the post id, so a fresh
    // notification fires every time the count goes up (3 comments today,
    // 5 tomorrow = two separate notifications) without needing a numeric
    // "last seen count" store this hook doesn't otherwise have.
    if (!post._count) return;
    if (post._count.comments > 0) {
      const key = `connect-post-comments-${post.id}-${post._count.comments}`;
      if (!notif.hasBeenNotified(key)) {
        notif.markNotified(key);
        notif.addNotification({
          type: 'family',
          isRead: false,
          title: '💬 New Comment',
          body: `Your Family Connect post has ${post._count.comments} comment${post._count.comments === 1 ? '' : 's'}.`,
          action: { label: 'View Post', route: 'FamilyConnect' },
        });
      }
    }
    if (post._count.reactions > 0) {
      const key = `connect-post-reactions-${post.id}-${post._count.reactions}`;
      if (!notif.hasBeenNotified(key)) {
        notif.markNotified(key);
        notif.addNotification({
          type: 'family',
          isRead: false,
          title: '❤️ New Reaction',
          body: `Your Family Connect post has ${post._count.reactions} reaction${post._count.reactions === 1 ? '' : 's'}.`,
          action: { label: 'View Post', route: 'FamilyConnect' },
        });
      }
    }
  });

  connect.coParentGrants.forEach((grant) => {
    if (grant.status === 'PENDING' && grant.holderFamilyId === myFamilyId) {
      const key = `coparent-grant-pending-${grant.id}`;
      if (notif.hasBeenNotified(key)) return;
      notif.markNotified(key);
      notif.addNotification({
        type: 'family',
        isRead: false,
        title: '👨‍👩‍👧 Co-Parent Access Request',
        body: `${grant.ownerFamily?.name ?? 'A connected household'} wants to share a child's profile with you.`,
        action: { label: 'Review', route: 'FamilyConnect' },
      });
      return;
    }
    // Status change on a grant YOU sent — let you know once it's been acted on.
    if (
      (grant.status === 'ACTIVE' || grant.status === 'DECLINED') &&
      grant.ownerFamilyId === myFamilyId &&
      auth.backendUserId &&
      grant.initiatedByUserId === auth.backendUserId
    ) {
      const key = `coparent-grant-resolved-${grant.id}-${grant.status}`;
      if (notif.hasBeenNotified(key)) return;
      notif.markNotified(key);
      notif.addNotification({
        type: 'family',
        isRead: false,
        title: grant.status === 'ACTIVE' ? '✅ Co-Parent Access Accepted' : '❌ Co-Parent Access Declined',
        body: `${grant.holderFamily?.name ?? 'The household'} ${grant.status === 'ACTIVE' ? 'accepted' : 'declined'} your co-parent access request.`,
        action: { label: 'View', route: 'FamilyConnect' },
      });
    }
  });
}

function scan() {
  const notif = useNotificationsStore.getState();
  const guardian = useGuardianStore.getState();
  const finance = useFinanceStore.getState();
  const family = useFamilyStore.getState();
  const childcare = useChildcareStore.getState();
  const school = useSchoolStore.getState();
  const board = useFamilyBoardStore.getState();
  const allowance = useAllowanceStore.getState();
  const gifts = useGiftStore.getState();
  const now = Date.now();
  const nowDate = new Date(now);

  guardian.sosAlerts.forEach((alert) => {
    const key = `sos-${alert.id}`;
    if (alert.isResolved) {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;
    notif.markNotified(key);
    notif.addNotification({
      type: 'emergency',
      isRead: false,
      title: '🚨 SOS Alert',
      body: alert.message?.trim() ? alert.message : 'A family member triggered an SOS alert. Check on them now.',
      action: { label: 'View Alert', route: 'SOSAlerts' },
      memberId: alert.memberId,
    });
  });

  guardian.approvalRequests.forEach((req) => {
    const key = `approval-${req.id}`;
    if (req.status !== 'pending') {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;
    notif.markNotified(key);
    notif.addNotification({
      type: 'family',
      isRead: false,
      title: '✅ Approval Needed',
      body: req.title,
      action: { label: 'Review', route: 'ApprovalRequests' },
      memberId: req.memberId,
    });
  });

  finance.bills.forEach((bill) => {
    const overdueKey = `bill-overdue-${bill.id}`;
    const dueSoonKey = `bill-duesoon-${bill.id}`;

    if (bill.status === 'paid') {
      if (notif.hasBeenNotified(overdueKey)) notif.clearNotified(overdueKey);
      if (notif.hasBeenNotified(dueSoonKey)) notif.clearNotified(dueSoonKey);
      return;
    }

    const daysUntilDue = (new Date(bill.dueDate).getTime() - now) / DAY_MS;

    if (daysUntilDue < 0 && !notif.hasBeenNotified(overdueKey)) {
      notif.markNotified(overdueKey);
      notif.addNotification({
        type: 'bill',
        isRead: false,
        title: '💳 Bill Overdue',
        body: `${bill.name} ($${bill.amount.toLocaleString()}) is overdue.`,
        action: { label: 'View Bill', route: 'Finance' },
      });
    } else if (daysUntilDue >= 0 && daysUntilDue <= BILL_DUE_SOON_DAYS && !notif.hasBeenNotified(dueSoonKey)) {
      const days = Math.max(0, Math.ceil(daysUntilDue));
      notif.markNotified(dueSoonKey);
      notif.addNotification({
        type: 'bill',
        isRead: false,
        title: '💳 Bill Due Soon',
        body: `${bill.name} ($${bill.amount.toLocaleString()}) is due in ${days} day${days === 1 ? '' : 's'}.`,
        action: { label: 'View Bill', route: 'Finance' },
      });
    }
  });

  family.tasks.forEach((task) => {
    const key = `task-overdue-${task.id}`;
    const isOverdue = task.status !== 'completed' && !!task.dueDate && new Date(task.dueDate).getTime() < now;

    if (!isOverdue) {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;

    notif.markNotified(key);
    notif.addNotification({
      type: 'task',
      isRead: false,
      title: '⏰ Task Overdue',
      body: task.title,
      action: { label: 'View Tasks', route: 'Family' },
    });
  });

  finance.financialGoals.forEach((goal) => {
    if (goal.targetAmount <= 0) return;
    const pct = (goal.savedAmount / goal.targetAmount) * 100;

    GOAL_MILESTONES.forEach((threshold) => {
      if (pct < threshold) return;
      const key = `goal-milestone-${goal.id}-${threshold}`;
      if (notif.hasBeenNotified(key)) return;

      notif.markNotified(key);
      notif.addNotification({
        type: 'goal',
        isRead: false,
        title: threshold >= 100 ? '🎯 Goal Reached!' : `🎯 Goal ${threshold}% Reached!`,
        body: `You've saved $${goal.savedAmount.toLocaleString()} of your $${goal.targetAmount.toLocaleString()} ${goal.name} goal.`,
        action: { label: 'View Goals', route: 'Finance' },
      });
    });
  });

  childcare.bookings.forEach((booking) => {
    const key = `childcare-upcoming-${booking.id}`;
    if (booking.status !== 'upcoming') {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }

    const startMs = parseBookingStartMs(booking.date, booking.startTime);
    if (startMs === null) return;
    const hoursUntil = (startMs - now) / (60 * 60 * 1000);
    if (hoursUntil < 0 || hoursUntil > CHILDCARE_UPCOMING_HOURS) return;
    if (notif.hasBeenNotified(key)) return;

    const caregiver = childcare.caregivers.find((c) => c.id === booking.caregiverId);
    notif.markNotified(key);
    notif.addNotification({
      type: 'family',
      isRead: false,
      title: '👶 Childcare Booking Soon',
      body: `${caregiver?.name ?? 'Caregiver'} starts at ${booking.startTime} on ${booking.date}.`,
      action: { label: 'View Booking', route: 'ChildcareManager' },
    });
  });

  school.assignments.forEach((assignment) => {
    const overdueKey = `school-overdue-${assignment.id}`;
    const dueSoonKey = `school-duesoon-${assignment.id}`;

    if (assignment.status === 'completed') {
      if (notif.hasBeenNotified(overdueKey)) notif.clearNotified(overdueKey);
      if (notif.hasBeenNotified(dueSoonKey)) notif.clearNotified(dueSoonKey);
      return;
    }

    const daysUntilDue = (new Date(assignment.dueDate).getTime() - now) / DAY_MS;

    if (daysUntilDue < 0 && !notif.hasBeenNotified(overdueKey)) {
      notif.markNotified(overdueKey);
      notif.addNotification({
        type: 'school',
        isRead: false,
        title: '📚 Assignment Overdue',
        body: `"${assignment.title}" (${assignment.subject}) is overdue.`,
        action: { label: 'View Assignments', route: 'SchoolCenter' },
        memberId: assignment.memberId,
      });
    } else if (daysUntilDue >= 0 && daysUntilDue <= SCHOOL_DUE_SOON_DAYS && !notif.hasBeenNotified(dueSoonKey)) {
      const days = Math.max(0, Math.ceil(daysUntilDue));
      notif.markNotified(dueSoonKey);
      notif.addNotification({
        type: 'school',
        isRead: false,
        title: '📚 Assignment Due Soon',
        body: `"${assignment.title}" (${assignment.subject}) is due in ${days} day${days === 1 ? '' : 's'}.`,
        action: { label: 'View Assignments', route: 'SchoolCenter' },
        memberId: assignment.memberId,
      });
    }
  });

  // Urgent or pinned board posts get a real notification — no clearing
  // needed since a post's urgency/pinned state isn't something that
  // "resolves" the way an overdue bill or task does. Works for posts
  // synced in from another family member's device too, since this reads
  // the same store hydratePosts() populates.
  board.posts.forEach((post) => {
    if (post.priority !== 'urgent' && !post.isPinned) return;
    const key = `board-post-${post.id}`;
    if (notif.hasBeenNotified(key)) return;

    notif.markNotified(key);
    notif.addNotification({
      type: 'family',
      isRead: false,
      title: post.priority === 'urgent' ? '🚨 Urgent Announcement' : '📌 Pinned Announcement',
      body: post.title,
      action: { label: 'View Board', route: 'FamilyBoard' },
    });
  });

  allowance.configs.forEach((config) => {
    const key = `allowance-due-${config.id}`;
    if (!config.isActive) {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }

    const daysSincePaid = config.lastPaidDate
      ? (now - new Date(config.lastPaidDate).getTime()) / DAY_MS
      : Infinity;

    if (daysSincePaid < ALLOWANCE_DUE_DAYS) {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;

    const member = family.members.find((m) => m.id === config.memberId);
    notif.markNotified(key);
    notif.addNotification({
      type: 'family',
      isRead: false,
      title: '💰 Allowance Due',
      body: `${member?.name ?? 'A family member'}'s weekly $${config.weeklyAmount.toFixed(2)} allowance hasn't been paid in over a week.`,
      action: { label: 'View Allowance', route: 'Allowance' },
      memberId: config.memberId,
    });
  });

  family.members.forEach((member) => {
    if (!member.dateOfBirth) return;
    const key = `gift-birthday-${member.id}`;

    const upcoming = nextBirthday(member.dateOfBirth, nowDate);
    if (!upcoming) return; // unparseable date — skip silently
    const daysUntil = (upcoming.getTime() - nowDate.getTime()) / DAY_MS;

    const hasGiftIdea = gifts.gifts.some((g) => g.forMemberId === member.id && g.occasion === 'birthday' && g.status !== 'given');

    if (daysUntil < 0 || daysUntil > GIFT_BIRTHDAY_LEAD_DAYS || hasGiftIdea) {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;

    const days = Math.max(0, Math.ceil(daysUntil));
    notif.markNotified(key);
    notif.addNotification({
      type: 'family',
      isRead: false,
      title: '🎂 Birthday Coming Up',
      body: `${member.name}'s birthday is in ${days} day${days === 1 ? '' : 's'} — no gift idea saved yet.`,
      action: { label: 'Plan a Gift', route: 'GiftPlanner' },
      memberId: member.id,
    });
  });

  // Fire-and-forget: Connect data has to be fetched over the network first
  // (see scanConnect's comment), so it shouldn't hold up everything above,
  // which only ever reads state that's already in memory.
  scanConnect(notif, family).catch(() => {
    // offline/unreachable — just skip this pass, same as every other
    // best-effort fetch* action in useConnectStore.
  });
}

export function useNotificationTriggers() {
  useAppStateInterval(scan, SCAN_INTERVAL_MS);
}
