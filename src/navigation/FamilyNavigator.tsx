import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoleGuard } from '../components/auth/RoleGuard';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { ProfileSwitcherScreen } from '../screens/family/ProfileSwitcherScreen';
import { AddMemberScreen } from '../screens/family/AddMemberScreen';
import { JoinFamilyScreen } from '../screens/family/JoinFamilyScreen';
import { JoinRequestsScreen } from '../screens/family/JoinRequestsScreen';
import { FamilyInviteQRScreen } from '../screens/family/FamilyInviteQRScreen';
import { MemberDetailsScreen } from '../screens/family/MemberDetailsScreen';
import { FamilyProfilesScreen } from '../screens/family/FamilyProfilesScreen';
import { CalendarScreen } from '../screens/family/CalendarScreen';
import { TasksScreen } from '../screens/family/TasksScreen';
import { SchoolCenterScreen } from '../screens/family/SchoolCenterScreen';
import { LegacyVaultScreen } from '../screens/family/LegacyVaultScreen';
import { ConflictResolverScreen } from '../screens/family/ConflictResolverScreen';
import { RelationshipHealthScreen } from '../screens/family/RelationshipHealthScreen';
import { ReputationScreen } from '../screens/family/ReputationScreen';
import { AchievementsScreen } from '../screens/family/AchievementsScreen';
import { HabitsScreen } from '../screens/family/HabitsScreen';
import { MoodTrackerScreen } from '../screens/family/MoodTrackerScreen';
import { FamilyMeetingScreen } from '../screens/family/FamilyMeetingScreen';
import { FamilyTimelineScreen } from '../screens/family/FamilyTimelineScreen';
import { KidsModeScreen } from '../screens/family/KidsModeScreen';
import { FamilyPollsScreen } from '../screens/family/FamilyPollsScreen';
import { ChoreRotationScreen } from '../screens/family/ChoreRotationScreen';
import { AllowanceScreen } from '../screens/family/AllowanceScreen';
import { FamilyJournalScreen } from '../screens/family/FamilyJournalScreen';
import { GiftPlannerScreen } from '../screens/family/GiftPlannerScreen';
import { FamilyGoalsScreen } from '../screens/family/FamilyGoalsScreen';
import { BucketListScreen } from '../screens/family/BucketListScreen';
import { HomeworkTrackerScreen } from '../screens/family/HomeworkTrackerScreen';
import { ActivitiesTrackerScreen } from '../screens/family/ActivitiesTrackerScreen';
import { BirthdayTrackerScreen } from '../screens/family/BirthdayTrackerScreen';
import { FamilyBoardScreen } from '../screens/family/FamilyBoardScreen';
import { ReadingTrackerScreen } from '../screens/family/ReadingTrackerScreen';
import { VolunteerTrackerScreen } from '../screens/family/VolunteerTrackerScreen';
import { GuardianDashboardScreen } from '../screens/family/guardian/GuardianDashboardScreen';
import { BlockedSitesScreen } from '../screens/family/guardian/BlockedSitesScreen';
import { GuardianDataPrivacyScreen } from '../screens/family/guardian/GuardianDataPrivacyScreen';
import { ChildDeviceDetailScreen } from '../screens/family/guardian/ChildDeviceDetailScreen';
import { ScreenTimeScreen } from '../screens/family/guardian/ScreenTimeScreen';
import { SOSAlertsScreen } from '../screens/family/guardian/SOSAlertsScreen';
import { ApprovalRequestsScreen } from '../screens/family/guardian/ApprovalRequestsScreen';
import { RegisterChildDeviceScreen } from '../screens/family/guardian/RegisterChildDeviceScreen';
import { EnterPairingCodeScreen } from '../screens/family/guardian/EnterPairingCodeScreen';
import { PairChildDeviceScreen } from '../screens/family/guardian/PairChildDeviceScreen';
import { GuardianChatScreen } from '../screens/family/guardian/GuardianChatScreen';
import { RewardsScreen } from '../screens/operations/RewardsScreen';
import { FamilyConnectScreen } from '../screens/family/FamilyConnectScreen';
import { CoParentingScreen } from '../screens/family/CoParentingScreen';
import { withScreenErrorBoundary } from './withScreenErrorBoundary';

const Stack = createNativeStackNavigator();

export function FamilyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Shared family core */}
      <Stack.Screen name="FamilyProfiles" component={withScreenErrorBoundary(FamilyProfilesScreen)} />
      <Stack.Screen name="ProfileSwitcher" component={withScreenErrorBoundary(ProfileSwitcherScreen)} />
      <Stack.Screen name="AddMember" component={withScreenErrorBoundary(AddMemberScreen)} />
      <Stack.Screen name="MemberDetails" component={withScreenErrorBoundary(MemberDetailsScreen)} />
      <Stack.Screen name="Calendar" component={withScreenErrorBoundary(CalendarScreen)} />
      <Stack.Screen name="FamilyBoard" component={withScreenErrorBoundary(FamilyBoardScreen)} />
      <Stack.Screen name="FamilyConnect" component={withScreenErrorBoundary(FamilyConnectScreen)} />
      <Stack.Screen name="CoParenting" component={withScreenErrorBoundary(CoParentingScreen)} />

      {/* Invite / joining */}
      <Stack.Screen name="JoinFamily" component={withScreenErrorBoundary(JoinFamilyScreen)} />

      <Stack.Screen name="FamilyInviteQR">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <FamilyInviteQRScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="JoinRequests">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <JoinRequestsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      {/* Tasks / school */}
      <Stack.Screen name="Tasks" component={withScreenErrorBoundary(TasksScreen)} />
      <Stack.Screen name="HomeworkTracker" component={withScreenErrorBoundary(HomeworkTrackerScreen)} />

      <Stack.Screen name="SchoolCenter">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <SchoolCenterScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      {/* Family memory / legacy */}
      <Stack.Screen name="LegacyVault">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowGrandparent>
            <LegacyVaultScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyTimeline">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowGrandparent>
            <FamilyTimelineScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="BirthdayTracker">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowGrandparent>
            <BirthdayTrackerScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="GiftPlanner">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowGrandparent>
            <GiftPlannerScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyJournal">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowGrandparent>
            <FamilyJournalScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      {/* Wellness / relationship */}
      <Stack.Screen name="RelationshipHealth">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowGrandparent>
            <RelationshipHealthScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="MoodTracker">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <MoodTrackerScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="Habits">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <HabitsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      {/* Parent/admin household controls */}
      <Stack.Screen name="ConflictResolver">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <ConflictResolverScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="Reputation">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <ReputationScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyMeeting">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <FamilyMeetingScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyPolls">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <FamilyPollsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="ChoreRotation">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <ChoreRotationScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="Allowance">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <AllowanceScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyGoals">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <FamilyGoalsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="BucketList">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <BucketListScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="ActivitiesTracker">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <ActivitiesTrackerScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      {/* Guardian / parental controls */}
      <Stack.Screen name="GuardianDashboard">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <GuardianDashboardScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="ChildDeviceDetail">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <ChildDeviceDetailScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="ScreenTime">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <ScreenTimeScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="SOSAlerts">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <SOSAlertsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="BlockedSites"
        options={{ headerShown: false }}
      >
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <BlockedSitesScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="GuardianDataPrivacy"
        options={{ headerShown: false }}
      >
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <GuardianDataPrivacyScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="ApprovalRequests">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <ApprovalRequestsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="RegisterChildDevice">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <RegisterChildDeviceScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="EnterPairingCode">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <EnterPairingCodeScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="PairChildDevice">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <PairChildDeviceScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="GuardianChat">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <GuardianChatScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      {/* Child-specific */}
      <Stack.Screen name="KidsMode">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <KidsModeScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="Achievements">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <AchievementsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="Rewards">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <RewardsScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="ReadingTracker">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent allowChild>
            <ReadingTrackerScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>

      <Stack.Screen name="VolunteerTracker">
        {(props) => (
          <ErrorBoundary>
          <RoleGuard allowParent>
            <VolunteerTrackerScreen {...props} />
          </RoleGuard>
          </ErrorBoundary>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
