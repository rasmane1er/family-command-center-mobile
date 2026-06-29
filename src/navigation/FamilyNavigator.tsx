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
        {(props) => (
          <RoleGuard allowParent>
            <FamilyInviteQRScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="JoinRequests">
        {(props) => (
          <RoleGuard allowParent>
            <JoinRequestsScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Tasks / school */}
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="HomeworkTracker" component={HomeworkTrackerScreen} />

      <Stack.Screen name="SchoolCenter">
        {(props) => (
          <RoleGuard allowParent allowChild>
            <SchoolCenterScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Family memory / legacy */}
      <Stack.Screen name="LegacyVault">
        {(props) => (
          <RoleGuard allowParent allowGrandparent>
            <LegacyVaultScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyTimeline">
        {(props) => (
          <RoleGuard allowParent allowGrandparent>
            <FamilyTimelineScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="BirthdayTracker">
        {(props) => (
          <RoleGuard allowParent allowGrandparent>
            <BirthdayTrackerScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="GiftPlanner">
        {(props) => (
          <RoleGuard allowParent allowGrandparent>
            <GiftPlannerScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyJournal">
        {(props) => (
          <RoleGuard allowParent allowGrandparent>
            <FamilyJournalScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Wellness / relationship */}
      <Stack.Screen name="RelationshipHealth">
        {(props) => (
          <RoleGuard allowParent allowGrandparent>
            <RelationshipHealthScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="MoodTracker">
        {(props) => (
          <RoleGuard allowParent allowChild>
            <MoodTrackerScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Habits">
        {(props) => (
          <RoleGuard allowParent allowChild>
            <HabitsScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Parent/admin household controls */}
      <Stack.Screen name="ConflictResolver">
        {(props) => (
          <RoleGuard allowParent>
            <ConflictResolverScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Reputation">
        {(props) => (
          <RoleGuard allowParent>
            <ReputationScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyMeeting">
        {(props) => (
          <RoleGuard allowParent>
            <FamilyMeetingScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyPolls">
        {(props) => (
          <RoleGuard allowParent>
            <FamilyPollsScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="ChoreRotation">
        {(props) => (
          <RoleGuard allowParent>
            <ChoreRotationScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Allowance">
        {(props) => (
          <RoleGuard allowParent>
            <AllowanceScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="FamilyGoals">
        {(props) => (
          <RoleGuard allowParent>
            <FamilyGoalsScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="BucketList">
        {(props) => (
          <RoleGuard allowParent>
            <BucketListScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="ActivitiesTracker">
        {(props) => (
          <RoleGuard allowParent>
            <ActivitiesTrackerScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      {/* Guardian / parental controls */}
      <Stack.Screen name="GuardianDashboard" component={GuardianDashboardScreen} />
      <Stack.Screen name="ChildDeviceDetail" component={ChildDeviceDetailScreen} />
      <Stack.Screen name="Geofence" component={GeofenceScreen} />
      <Stack.Screen name="ScreenTime" component={ScreenTimeScreen} />
      <Stack.Screen name="SOSAlerts" component={SOSAlertsScreen} />
      <Stack.Screen name="ApprovalRequests" component={ApprovalRequestsScreen} />
      <Stack.Screen name="PairDevice" component={PairDeviceScreen} />

      {/* Child-specific */}
      <Stack.Screen name="KidsMode">
        {(props) => (
          <RoleGuard allowParent allowChild>
            <KidsModeScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>

      <Stack.Screen name="Achievements">
        {(props) => (
          <RoleGuard allowParent allowChild>
            <AchievementsScreen {...props} />
          </RoleGuard>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
