import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const CODE_LENGTH = 6;

export function ChildConnectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const joinWithCode = useFamilyStore((s) => s.joinWithCode);

  const handleConnect = async () => {
    if (code.trim().length < CODE_LENGTH) return;
    setLoading(true);
    try {
      await joinWithCode(code.trim());
      setOnboarded(true);
    } catch {
      Alert.alert(
        'Code Not Found',
        'That code doesn\'t match any family. Check the code with your parent and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable onPress={handleBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <View style={styles.iconBg}>
            <Ionicons name="shield" size={48} color="#7C6FFF" />
            <View style={styles.heartBadge}>
              <Ionicons name="heart" size={10} color="#FF6B8A" />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Connect to Family</Text>
        <Text style={styles.subtitle}>
          Enter the 6-character code shown on your parent's phone
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH))}
          placeholder="X X X X X X"
          placeholderTextColor="rgba(255,255,255,0.2)"
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          maxLength={CODE_LENGTH}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleConnect}
        />

        <Pressable
          style={[styles.connectBtn, (code.length < CODE_LENGTH || loading) && styles.connectBtnDisabled]}
          onPress={handleConnect}
          disabled={code.length < CODE_LENGTH || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.connectBtnText}>Connect</Text>
          )}
        </Pressable>
      </View>

      <Text style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        This app is monitored by your family
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F2B',
    alignItems: 'center',
  },

  backBtn: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 12,
    padding: 8,
  },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },

  iconWrap: {
    marginBottom: 28,
  },

  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 26,
    backgroundColor: '#1A1D4E',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  heartBadge: {
    position: 'absolute',
    bottom: 10,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B8A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },

  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },

  codeInput: {
    width: '100%',
    height: 68,
    backgroundColor: '#1A1D4E',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#5C5FE8',
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
  },

  connectBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  connectBtnDisabled: {
    opacity: 0.45,
  },

  connectBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
});
