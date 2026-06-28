import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoleGuard } from '../components/auth/RoleGuard';
import { ProfileSwitcherScreen } from '../screens/family/ProfileSwitcherScreen';
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
import { GuardianDashboardScreen } from '../screens/family/guardian/GuardianDashboardScreen';
import { ChildDeviceDetailScreen } from '../screens/family/guardian/ChildDeviceDetailScreen';
import { GeofenceScreen } from '../screens/family/guardian/GeofenceScreen';
import { ScreenTimeScreen } from '../screens/family/guardian/ScreenTimeScreen';
import { SOSAlertsScreen } from '../screens/family/guardian/SOSAlertsScreen';
import { ApprovalRequestsScreen } from '../screens/family/guardian/ApprovalRequestsScreen';
import { PairDeviceScreen } from '../screens/family/guardian/PairDeviceScreen';


const Stack = createNativeStackNavigator();

export function FamilyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Shared family core */}
      <Stack.Screen name="FamilyProfiles" component={FamilyProfilesScreen} />
      <Stack.Screen name="ProfileSwitcher" component={ProfileSwitcherScreen} />
      <Stack.Screen name="MemberDetails" component={MemberDetailsScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="FamilyBoard" component={FamilyBoardScreen} />

      {/* Invite / joining */}
      <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />

      <Stack.Screen name="FamilyInviteQR">
        {() => (
          <RoleGuard allowParent>
            <FamilyInviteQRScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="JoinRequests">
        {() => (
          <RoleGuard allowParent>
            <JoinRequestsScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Tasks / school */}
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="HomeworkTracker" component={HomeworkTrackerScreen} />

      <Stack.Screen name="SchoolCenter">
        {() => (
          <RoleGuard allowParent allowChild>
            <SchoolCenterScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Family memory / legacy */}
      <Stack.Screen name="LegacyVault">
        {() => (
          <RoleGuard allowParent allowGrandparent>
            <LegacyVaultScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyTimeline">
        {() => (
          <RoleGuard allowParent allowGrandparent>
            <FamilyTimelineScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="BirthdayTracker">
        {() => (
          <RoleGuard allowParent allowGrandparent>
            <BirthdayTrackerScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="GiftPlanner">
        {() => (
          <RoleGuard allowParent allowGrandparent>
            <GiftPlannerScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyJournal">
        {() => (
          <RoleGuard allowParent allowGrandparent>
            <FamilyJournalScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Wellness / relationship */}
      <Stack.Screen name="RelationshipHealth">
        {() => (
          <RoleGuard allowParent allowGrandparent>
            <RelationshipHealthScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="MoodTracker">
        {() => (
          <RoleGuard allowParent allowChild>
            <MoodTrackerScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Habits">
        {() => (
          <RoleGuard allowParent allowChild>
            <HabitsScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Parent/admin household controls */}
      <Stack.Screen name="ConflictResolver">
        {() => (
          <RoleGuard allowParent>
            <ConflictResolverScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Reputation">
        {() => (
          <RoleGuard allowParent>
            <ReputationScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyMeeting">
        {() => (
          <RoleGuard allowParent>
            <FamilyMeetingScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyPolls">
        {() => (
          <RoleGuard allowParent>
            <FamilyPollsScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="ChoreRotation">
        {() => (
          <RoleGuard allowParent>
            <ChoreRotationScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Allowance">
        {() => (
          <RoleGuard allowParent>
            <AllowanceScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyGoals">
        {() => (
          <RoleGuard allowParent>
            <FamilyGoalsScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="BucketList">
        {() => (
          <RoleGuard allowParent>
            <BucketListScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="ActivitiesTracker">
        {() => (
          <RoleGuard allowParent>
            <ActivitiesTrackerScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Guardian / parental controls — use component= so navigation/route props are passed correctly */}
      <Stack.Screen name="GuardianDashboard" component={GuardianDashboardScreen} />
      <Stack.Screen name="ChildDeviceDetail" component={ChildDeviceDetailScreen} />
      <Stack.Screen name="Geofence" component={GeofenceScreen} />
      <Stack.Screen name="ScreenTime" component={ScreenTimeScreen} />
      <Stack.Screen name="SOSAlerts" component={SOSAlertsScreen} />
      <Stack.Screen name="ApprovalRequests" component={ApprovalRequestsScreen} />
      <Stack.Screen name="PairDevice" component={PairDeviceScreen} />

      {/* Child-specific */}
      <Stack.Screen name="KidsMode">
        {() => (
          <RoleGuard allowParent allowChild>
            <KidsModeScreen />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Achievements">
        {() => (
          <RoleGuard allowParent allowChild>
            <AchievementsScreen />
          </RoleGuard>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
