import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';

export function ProfileSwitcherScreen({ navigation }: any) {
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const setActiveMember = useFamilyStore((s) => s.setActiveMember);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Switch Profile</Text>

      {members.map((member) => {
        const isActive = member.id === activeMemberId;

        return (
          <Card
            key={member.id}
            style={isActive ? { ...styles.card, ...styles.activeCard } : styles.card}
            onPress={() => {
              setActiveMember(member.id);
              navigation.goBack();
            }}
          >
            <Avatar name={member.name} color={member.avatarColor} size={48} />
            <Text style={styles.name}>{member.name}</Text>
            {isActive && <Text style={styles.active}>Active</Text>}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 18 },
  card: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeCard: { borderWidth: 2, borderColor: colors.primary },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  active: { fontSize: 12, fontWeight: '800', color: colors.primary },
});