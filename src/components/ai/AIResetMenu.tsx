import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export interface ResetAction {
  label: string;
  description: string;
  icon: string;
  danger?: boolean;
  onPress: () => void;
}

interface Props {
  actions: ResetAction[];
  /** small icon button trigger */
  iconColor?: string;
}

export function AIResetMenu({ actions, iconColor = 'rgba(255,255,255,0.6)' }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  function run(action: ResetAction) {
    setVisible(false);
    if (action.danger) {
      Alert.alert(
        action.label,
        t('screens.shared.aiResetCannotBeUndone', { description: action.description }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: action.label, style: 'destructive', onPress: action.onPress },
        ]
      );
    } else {
      Alert.alert(action.label, action.description, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: action.onPress },
      ]);
    }
  }

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setVisible(true)} style={styles.trigger} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={20} color={iconColor} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable accessibilityRole="button" style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('screens.shared.aiResetOptionsTitle')}</Text>

            {actions.map((action, i) => (
              <Pressable accessibilityRole="button"
                key={i}
                style={[styles.row, i < actions.length - 1 && styles.rowBorder]}
                onPress={() => run(action)}
              >
                <View style={[styles.iconBox, action.danger && styles.iconBoxDanger]}>
                  <Ionicons
                    name={action.icon as any}
                    size={18}
                    color={action.danger ? '#EF4444' : '#6366F1'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, action.danger && styles.rowLabelDanger]}>
                    {action.label}
                  </Text>
                  <Text style={styles.rowDesc}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#555" />
              </Pressable>
            ))}

            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => setVisible(false)}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: '#333',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    color: '#888', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#6366F122',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBoxDanger: { backgroundColor: '#EF444422' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rowLabelDanger: { color: '#EF4444' },
  rowDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  cancelBtn: {
    marginTop: 12,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
});
