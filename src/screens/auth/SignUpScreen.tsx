import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore, SignUpData } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';
import { populateFromSignUp } from '../../utils/populateFromSignUp';

interface Props {
  navigation: any;
}

const AVATAR_COLORS = [
  '#4A8FD9', '#E74C3C', '#27AE60', '#F5A623', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2ECC71', '#3498DB', '#E91E63',
];

const ROLE_OPTIONS: { key: 'parent' | 'co_parent' | 'single_parent' | 'guardian' | 'other'; label: string; icon: string }[] = [
  { key: 'parent', label: 'Parent', icon: 'person' },
  { key: 'co_parent', label: 'Co-Parent', icon: 'people' },
  { key: 'single_parent', label: 'Single Parent', icon: 'person-circle' },
  { key: 'guardian', label: 'Guardian', icon: 'shield-checkmark' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '', color: 'transparent', width: '0%' };
  if (pw.length < 6) return { label: 'Weak', color: '#E74C3C', width: '25%' };
  if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
    return { label: 'Fair', color: '#F5A623', width: '60%' };
  return { label: 'Strong', color: '#27AE60', width: '100%' };
}

export default function SignUpScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuthStore();
  const s = makeStyles(colors);

  const [step, setStep] = useState(1);

  // Step 1 — Personal Info
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarColor, setAvatarColor] = useState('#4A8FD9');
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [dobFocused, setDobFocused] = useState(false);

  // Step 2 — Family Setup
  const [familyName, setFamilyName] = useState('');
  const [familyRole, setFamilyRole] = useState<'parent' | 'co_parent' | 'single_parent' | 'guardian' | 'other'>('parent');
  const [city, setCity] = useState('');
  const [familyNameFocused, setFamilyNameFocused] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);

  // Step 3 — Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const handleStep1Next = () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Required', 'Please enter a valid email address.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const handleStep2Next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(3);
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms of Service.');
      return;
    }
    setLoading(true);
    const data: SignUpData = {
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || undefined,
      avatarColor,
      familyName: familyName.trim() || undefined,
      familyRole,
      city: city.trim() || undefined,
    };
    const result = await signUp(data);
    setLoading(false);
    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sign Up Failed', result.error ?? 'An unexpected error occurred.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { user } = useAuthStore.getState();
      if (user) populateFromSignUp(user);
      // AppNavigator will redirect automatically
    }
  };

  const strength = getPasswordStrength(password);
  const passwordsNoMatch = confirmPassword.length > 0 && password !== confirmPassword;
  const inputBg = (colors as any).surface ?? '#F8FAFD';

  // ── Step Progress Bar ────────────────────────────────────────────────────────
  const StepBar = () => {
    const labels = ['You', 'Family', 'Security'];
    return (
      <View style={s.stepBarRow}>
        {[1, 2, 3].map((n) => {
          const isActive = n === step;
          const isDone = n < step;
          return (
            <React.Fragment key={n}>
              <View style={s.stepItem}>
                <View
                  style={[
                    s.stepDot,
                    (isActive || isDone) && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={[s.stepDotText, isActive && { color: '#fff' }]}>{n}</Text>
                  )}
                </View>
                <Text style={[s.stepLabel, isActive && { color: colors.primary, fontWeight: '700' }]}>
                  {labels[n - 1]}
                </Text>
              </View>
              {n < 3 && (
                <View style={[s.stepLine, n < step && { backgroundColor: colors.primary }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // ── Step 1 ───────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <Text style={[s.cardTitle, { color: colors.text }]}>Create Account</Text>
      <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>Tell us about yourself</Text>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Full Name *</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: nameFocused ? colors.primary : colors.border }]}>
          <Ionicons name="person-outline" size={18} color={nameFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="Jane Johnson"
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            onFocus={() => setNameFocused(true)}
            onBlur={() => {
              setNameFocused(false);
              if (!familyName && displayName.trim()) {
                const lastName = displayName.trim().split(' ').pop() ?? displayName.trim();
                setFamilyName(`The ${lastName} Family`);
              }
            }}
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Email Address *</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: emailFocused ? colors.primary : colors.border }]}>
          <Ionicons name="mail-outline" size={18} color={emailFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Phone Number</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: phoneFocused ? colors.primary : colors.border }]}>
          <Ionicons name="call-outline" size={18} color={phoneFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Date of Birth</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: dobFocused ? colors.primary : colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={dobFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={colors.textSecondary}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType="numeric"
            maxLength={10}
            onFocus={() => setDobFocused(true)}
            onBlur={() => setDobFocused(false)}
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Choose your color</Text>
        <View style={s.colorRow}>
          {AVATAR_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.colorCircle, { backgroundColor: c }, avatarColor === c && s.colorCircleSelected]}
              onPress={() => { setAvatarColor(c); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              {avatarColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
        <Pressable onPress={handleStep1Next} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <LinearGradient
            colors={['#1E4A8A', '#0F2952']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.primaryBtn}
          >
            <Text style={s.primaryBtnText}>Next: Family Setup →</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <View style={s.bottomRowInCard}>
        <Text style={[s.bottomText2, { color: colors.textSecondary }]}>Already have an account? </Text>
        <Pressable onPress={() => navigation.navigate('SignIn')}>
          <Text style={[s.bottomLink2, { color: colors.primary }]}>Sign In</Text>
        </Pressable>
      </View>
    </>
  );

  // ── Step 2 ───────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <Text style={[s.cardTitle, { color: colors.text }]}>Family Setup</Text>
      <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>Set up your family profile</Text>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Family Name</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: familyNameFocused ? colors.primary : colors.border }]}>
          <Ionicons name="home-outline" size={18} color={familyNameFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="The Johnson Family"
            placeholderTextColor={colors.textSecondary}
            value={familyName}
            onChangeText={setFamilyName}
            autoCapitalize="words"
            onFocus={() => setFamilyNameFocused(true)}
            onBlur={() => setFamilyNameFocused(false)}
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>What's your role?</Text>
        <View style={s.roleGrid}>
          {ROLE_OPTIONS.map((opt) => {
            const active = familyRole === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[
                  s.roleChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => { setFamilyRole(opt.key); Haptics.selectionAsync(); }}
              >
                <Ionicons name={opt.icon as any} size={16} color={active ? '#fff' : colors.text} />
                <Text style={[s.roleChipText, { color: active ? '#fff' : colors.text }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>City / Location</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: cityFocused ? colors.primary : colors.border }]}>
          <Ionicons name="location-outline" size={18} color={cityFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="New York, NY"
            placeholderTextColor={colors.textSecondary}
            value={city}
            onChangeText={setCity}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setCityFocused(false)}
          />
        </View>
      </View>

      <View style={s.twoButtonRow}>
        <Pressable style={[s.backBtn, { borderColor: colors.border }]} onPress={() => setStep(1)}>
          <Text style={[s.backBtnText, { color: colors.text }]}>← Back</Text>
        </Pressable>
        <Animated.View style={{ flex: 1, transform: [{ scale: buttonScale }] }}>
          <Pressable onPress={handleStep2Next} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <LinearGradient
              colors={['#1E4A8A', '#0F2952']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.primaryBtn}
            >
              <Text style={s.primaryBtnText}>Next: Security →</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );

  // ── Step 3 ───────────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <>
      <Text style={[s.cardTitle, { color: colors.text }]}>Security</Text>
      <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>Protect your family account</Text>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Password</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: passwordFocused ? colors.primary : colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} style={s.eyeIcon} />
          </Pressable>
        </View>
        {password.length > 0 && (
          <View style={s.strengthRow}>
            <View style={s.strengthTrack}>
              <View style={[s.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
            </View>
            <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
          </View>
        )}
      </View>

      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
        <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: confirmFocused ? colors.primary : colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={confirmFocused ? colors.primary : colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={[s.textInput, { color: colors.text }]}
            placeholder="Re-enter password"
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            onFocus={() => setConfirmFocused(true)}
            onBlur={() => setConfirmFocused(false)}
          />
          {confirmPassword.length > 0 && (
            <Ionicons
              name={passwordsNoMatch ? 'close-circle' : 'checkmark-circle'}
              size={18}
              color={passwordsNoMatch ? '#E74C3C' : '#27AE60'}
              style={s.eyeIcon}
            />
          )}
          <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>
      </View>

      <View style={[s.toggleRow, { borderColor: colors.border }]}>
        <View style={s.toggleLeft}>
          <Ionicons name="finger-print-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
          <View>
            <Text style={[s.toggleTitle, { color: colors.text }]}>Enable Face ID / Touch ID</Text>
            <Text style={[s.toggleSub, { color: colors.textSecondary }]}>Quick & secure sign in</Text>
          </View>
        </View>
        <Switch
          value={biometricEnabled}
          onValueChange={setBiometricEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <Pressable style={s.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)}>
        <View style={[s.checkbox, { borderColor: agreedToTerms ? colors.primary : colors.border, backgroundColor: agreedToTerms ? colors.primary : 'transparent' }]}>
          {agreedToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={[s.termsText, { color: colors.textSecondary }]}>
          {'I agree to the '}
          <Text
            style={{ color: colors.primary, fontWeight: '600' }}
            onPress={() => Alert.alert('Terms of Service', 'Please review our Terms of Service at familycommandcenter.com/terms')}
          >
            Terms of Service
          </Text>
          {' and '}
          <Text
            style={{ color: colors.primary, fontWeight: '600' }}
            onPress={() => Alert.alert('Privacy Policy', 'Please review our Privacy Policy at familycommandcenter.com/privacy')}
          >
            Privacy Policy
          </Text>
        </Text>
      </Pressable>

      <View style={s.twoButtonRow}>
        <Pressable style={[s.backBtn, { borderColor: colors.border }]} onPress={() => setStep(2)}>
          <Text style={[s.backBtnText, { color: colors.text }]}>← Back</Text>
        </Pressable>
        <Animated.View style={{ flex: 1, transform: [{ scale: buttonScale }] }}>
          <Pressable onPress={handleSignUp} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={loading}>
            <LinearGradient
              colors={['#F5A623', '#FF8C42']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.primaryBtn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.primaryBtnText}>Create Account</Text>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#040D1A', '#0A1E3D', '#0F2952']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.orb1} />
      <View style={s.orb2} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoSection}>
            <View style={s.logoCircle}>
              <Ionicons name="shield-checkmark" size={40} color="#fff" />
            </View>
            <Text style={s.logoTitle}>Family Command Center</Text>
            <Text style={s.logoSubtitle}>Create your family account</Text>
          </View>

          <View style={[s.card, { backgroundColor: colors.card }]}>
            <StepBar />
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, alignItems: 'center' },

    orb1: {
      position: 'absolute', top: -80, left: -80,
      width: 280, height: 280, borderRadius: 140,
      backgroundColor: 'rgba(30, 74, 138, 0.45)', opacity: 0.6,
    },
    orb2: {
      position: 'absolute', bottom: 60, right: -100,
      width: 320, height: 320, borderRadius: 160,
      backgroundColor: 'rgba(0, 212, 170, 0.18)', opacity: 0.5,
    },

    logoSection: { alignItems: 'center', marginBottom: 24 },
    logoCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    logoTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.3, textAlign: 'center' },
    logoSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

    card: {
      width: '100%', borderRadius: 28, padding: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25, shadowRadius: 24, elevation: 16,
    },

    stepBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
    stepItem: { alignItems: 'center', gap: 4 },
    stepDot: {
      width: 28, height: 28, borderRadius: 14,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    stepDotText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    stepLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 6, marginBottom: 14 },

    cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    cardSubtitle: { fontSize: 14, marginBottom: 20 },

    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    inputRow: {
      flexDirection: 'row', alignItems: 'center',
      height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    eyeIcon: { marginLeft: 8 },
    textInput: { flex: 1, fontSize: 15, height: '100%' },

    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    colorCircle: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    colorCircleSelected: {
      borderWidth: 2, borderColor: '#fff',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
    },

    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    roleChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1.5,
    },
    roleChipText: { fontSize: 13, fontWeight: '600' },

    strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
    strengthTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
    strengthFill: { height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontWeight: '700', minWidth: 42 },

    toggleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 16,
    },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    toggleTitle: { fontSize: 14, fontWeight: '600' },
    toggleSub: { fontSize: 12, marginTop: 2 },

    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
    checkbox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
    },
    termsText: { flex: 1, fontSize: 13, lineHeight: 19 },

    primaryBtn: {
      height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

    twoButtonRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
    backBtn: {
      height: 52, borderRadius: 16, borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
    },
    backBtnText: { fontSize: 14, fontWeight: '600' },

    bottomRowInCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    bottomText2: { fontSize: 14 },
    bottomLink2: { fontSize: 14, fontWeight: '700' },
  });
}
