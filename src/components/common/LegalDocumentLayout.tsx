import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';

export interface LegalSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

interface Props {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  navigation: any;
}

export function LegalDocumentLayout({ title, lastUpdated, intro, sections, navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>{t('screens.shared.lastUpdated', { date: lastUpdated })}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{intro}</Text>

        {sections.map((section, i) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{i + 1}. {section.heading}</Text>
            {section.body.map((p, j) => (
              <Text key={j} style={styles.paragraph}>{p}</Text>
            ))}
            {section.bullets && (
              <View style={styles.bulletList}>
                {section.bullets.map((b, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <Text style={styles.footer}>{t('screens.shared.appFooterName')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  content: { padding: 20, paddingBottom: 48 },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 24 },
  section: { marginBottom: 22 },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  paragraph: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 21, marginBottom: 8 },
  bulletList: { marginTop: 4, gap: 6 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { fontSize: 13.5, color: colors.textMuted, lineHeight: 21 },
  bulletText: { flex: 1, fontSize: 13.5, color: colors.textSecondary, lineHeight: 21 },
  footer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 16 },
});
