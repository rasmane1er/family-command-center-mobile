import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

const Stack = createNativeStackNavigator();

export function FamilyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FamilyProfiles" component={FamilyProfilesScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="SchoolCenter" component={SchoolCenterScreen} />
      <Stack.Screen name="LegacyVault" component={LegacyVaultScreen} />
      <Stack.Screen name="ConflictResolver" component={ConflictResolverScreen} />
      <Stack.Screen name="RelationshipHealth" component={RelationshipHealthScreen} />
      <Stack.Screen name="Reputation" component={ReputationScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Habits" component={HabitsScreen} />
      <Stack.Screen name="MoodTracker" component={MoodTrackerScreen} />
      <Stack.Screen name="FamilyMeeting" component={FamilyMeetingScreen} />
      <Stack.Screen name="FamilyTimeline" component={FamilyTimelineScreen} />
      <Stack.Screen name="KidsMode" component={KidsModeScreen} />
      <Stack.Screen name="FamilyPolls" component={FamilyPollsScreen} />
      <Stack.Screen name="ChoreRotation" component={ChoreRotationScreen} />
      <Stack.Screen name="Allowance" component={AllowanceScreen} />
      <Stack.Screen name="FamilyJournal" component={FamilyJournalScreen} />
      <Stack.Screen name="GiftPlanner" component={GiftPlannerScreen} />
      <Stack.Screen name="FamilyGoals" component={FamilyGoalsScreen} />
      <Stack.Screen name="BucketList" component={BucketListScreen} />
    </Stack.Navigator>
  );
}
