import React, { useRef, useState } from 'react';
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
  Switch,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Formik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { useAuthStore, SignUpData } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';
import { populateFromSignUp } from '../../utils/populateFromSignUp';
import { resetAllStores } from '../../storage/resetAllStores';
import { useTranslation } from 'react-i18next';

// ─── constants ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4A8FD9', '#E74C3C', '#27AE60', '#F5A623', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2ECC71', '#3498DB', '#E91E63',
];

const ROLE_OPTIONS = [
  { key: 'parent'        as const, labelKey: 'auth.screens.signUp.roleParent',       icon: 'person-outline'           },
  { key: 'co_parent'     as const, labelKey: 'auth.screens.signUp.roleCoParent',     icon: 'people-outline'           },
  { key: 'single_parent' as const, labelKey: 'auth.screens.signUp.roleSingleParent', icon: 'person-circle-outline'    },
  { key: 'guardian'      as const, labelKey: 'auth.screens.signUp.roleGuardian',     icon: 'shield-checkmark-outline' },
  { key: 'other'         as const, labelKey: 'auth.screens.signUp.roleOther',        icon: 'ellipsis-horizontal'      },
] as const;

const GENDER_OPTIONS = [
  { key: 'male'       as const, labelKey: 'auth.screens.signUp.genderMale'      },
  { key: 'female'     as const, labelKey: 'auth.screens.signUp.genderFemale'    },
  { key: 'non_binary' as const, labelKey: 'auth.screens.signUp.genderNonBinary' },
  { key: 'prefer_not' as const, labelKey: 'auth.screens.signUp.genderPreferNot' },
] as const;

// ─── yup schemas ─────────────────────────────────────────────────────────────

const step1Schema = Yup.object({
  firstName:   Yup.string().trim().required('First name is required'),
  lastName:    Yup.string().trim().required('Last name is required'),
  email:       Yup.string().trim().email('Enter a valid email').required('Email is required'),
  phone:       Yup.string()
    .test('phone', 'Invalid phone number', v => !v || /^[\d\s\-+().]+$/.test(v))
    .optional(),
  dateOfBirth: Yup.string()
    .test('dob', 'Use MM/DD/YYYY', v => !v || /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(v))
    .optional(),
  occupation: Yup.string().optional(),
  bio:        Yup.string().max(300, 'Max 300 characters').optional(),
});

const step2Schema = Yup.object({
  familyName:    Yup.string().trim().required('Family name is required'),
  familyMotto:   Yup.string().optional(),
  streetAddress: Yup.string().optional(),
  city:          Yup.string().optional(),
  state:         Yup.string().optional(),
  zipCode:       Yup.string()
    .test('zip', 'Invalid ZIP code', v => !v || /^\d{5}(-\d{4})?$/.test(v))
    .optional(),
  ecName:  Yup.string().optional(),
  ecPhone: Yup.string()
    .test('ecphone', 'Invalid phone number', v => !v || /^[\d\s\-+().]+$/.test(v))
    .optional(),
});

function makeStep3Schema(t: (key: string) => string) {
  return Yup.object({
    password: Yup.string()
      .min(8, t('auth.screens.signUp.yupMinPassword'))
      .test('strength', t('auth.screens.signUp.yupPasswordStrength'), (v) =>
        !v || /[0-9]/.test(v) || /[^a-zA-Z0-9]/.test(v)
      )
      .required(t('auth.screens.signUp.yupPasswordRequired')),
    confirmPw: Yup.string()
      .oneOf([Yup.ref('password')], t('auth.screens.signUp.yupPasswordsMustMatch'))
      .required(t('auth.screens.signUp.yupConfirmPasswordRequired')),
    agreed: Yup.boolean().oneOf([true], t('auth.screens.signUp.yupTermsRequired')),
  });
}

// ─── form values ──────────────────────────────────────────────────────────────

interface FormValues {
  firstName: string; lastName: string; email: string;
  phone: string; dateOfBirth: string; occupation: string; bio: string;
  familyName: string; familyMotto: string;
  streetAddress: string; city: string; state: string; zipCode: string;
  ecName: string; ecPhone: string;
  password: string; confirmPw: string; agreed: boolean;
}

const INITIAL: FormValues = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
  occupation: '', bio: '',
  familyName: '', familyMotto: '', streetAddress: '', city: '',
  state: '', zipCode: '', ecName: '', ecPhone: '',
  password: '', confirmPw: '', agreed: false,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function pwStrength(pw: string, t: (key: string) => string) {
  if (!pw) return { label: '', color: 'transparent', pct: 0 };
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const long = pw.length >= 10;
  if (pw.length < 8 || (!hasNumber && !hasSpecial)) return { label: t('auth.screens.signUp.strengthWeak'), color: '#E74C3C', pct: 0.25 };
  if (pw.length >= 8 && hasNumber && !long) return { label: t('auth.screens.signUp.strengthMedium'), color: '#F5A623', pct: 0.60 };
  if (long && hasNumber && hasSpecial) return { label: t('auth.screens.signUp.strengthStrong'), color: '#27AE60', pct: 1.0 };
  return { label: t('auth.screens.signUp.strengthMedium'), color: '#F5A623', pct: 0.60 };
}

// ─── makeStyles ───────────────────────────────────────────────────────────────

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1 },
    orb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(78,143,217,0.14)', top: -90, right: -70 },
    orb2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(245,166,35,0.09)', bottom: 60, left: -80 },
    kav: { flex: 1 },
    scrollContent: { padding: 20 },
    card: {
      backgroundColor: colors.card, borderRadius: 28, padding: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14, shadowRadius: 24, elevation: 10,
    },
    // step bar
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    stepItem: { alignItems: 'center' },
    stepBubble: {
      width: 28, height: 28, borderRadius: 14, borderWidth: 2,
      borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.card,
    },
    stepBubbleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    stepBubbleText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    stepBubbleTextOn: { color: '#fff' },
    stepLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
    stepLabelActive: { color: colors.primary, fontWeight: '700' },
    stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4, marginBottom: 16 },
    stepLineDone: { backgroundColor: colors.primary },
    // section title
    secTitle: {
      fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase',
      color: colors.textMuted, marginBottom: 10, marginTop: 4,
    },
    // avatar
    avatarWrap: { alignItems: 'center', marginBottom: 18 },
    avatarCircle: {
      width: 110, height: 110, borderRadius: 55, alignItems: 'center',
      justifyContent: 'center', borderWidth: 3, borderColor: colors.border,
    },
    avatarImg: { width: 110, height: 110, borderRadius: 55 },
    avatarInitials: { fontSize: 38, fontWeight: '800', color: '#fff' },
    cameraBtn: {
      position: 'absolute', bottom: 2, right: 2, width: 32, height: 32,
      borderRadius: 16, backgroundColor: '#0F2952', borderWidth: 2,
      borderColor: colors.card, alignItems: 'center', justifyContent: 'center',
    },
    avatarHint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    colorLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6, alignSelf: 'flex-start' },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    colorDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    // field
    fieldWrap: { marginBottom: 14 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 5, marginLeft: 2 },
    fieldLabelOpt: { fontSize: 12, color: colors.textMuted },
    inputRow: {
      flexDirection: 'row', alignItems: 'center', minHeight: 52,
      borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: 14, backgroundColor: colors.surface ?? '#F8FAFD',
    },
    inputRowFocus: { borderColor: colors.primary },
    inputRowError: { borderColor: '#E74C3C' },
    textInput: { flex: 1, fontSize: 15, color: colors.text, marginLeft: 10, paddingVertical: 14 },
    multiInput: {
      borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
      color: colors.text, minHeight: 88, textAlignVertical: 'top',
      backgroundColor: colors.surface ?? '#F8FAFD',
    },
    multiInputFocus: { borderColor: colors.primary },
    multiInputError: { borderColor: '#E74C3C' },
    eyeBtn: { padding: 4 },
    errorText: { fontSize: 12, color: '#E74C3C', marginTop: 4, marginLeft: 2 },
    charCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 3 },
    halfRow: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    // chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTextOn: { color: '#fff' },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    roleChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border, minWidth: '45%', flexGrow: 1,
    },
    roleChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    roleChipTextOn: { color: '#fff' },
    // stepper
    stepperRow: {
      flexDirection: 'row', alignItems: 'center', minHeight: 52,
      borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
      paddingHorizontal: 14, backgroundColor: colors.surface ?? '#F8FAFD',
    },
    stepperLabel: { flex: 1, fontSize: 15, marginLeft: 10, color: colors.text },
    stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepperBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    stepperVal: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
    // toggle
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    toggleLabel: { fontSize: 15, color: colors.text },
    // terms
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginVertical: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    termsText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    termsLink: { color: colors.primary, fontWeight: '600' },
    // strength
    strengthBar: { height: 4, borderRadius: 2, marginTop: 6, backgroundColor: colors.border, overflow: 'hidden' },
    strengthFill: { height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 11, marginTop: 3, fontWeight: '600' },
    matchHint: { fontSize: 12, marginTop: 4 },
    // nav
    navRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    backBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    backBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
    nextBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    nextBtnGrad: { height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    nextBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    fullBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
    fullBtnGrad: { height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    fullBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    footerRow: { alignItems: 'center', marginTop: 20 },
    footerText: { fontSize: 14, color: colors.textSecondary },
    footerLink: { fontWeight: '800', color: colors.primary },
  });
}

// ─── reusable FormField ───────────────────────────────────────────────────────

interface FProps {
  label: string; icon: string; placeholder: string;
  value: string; onChangeText: (t: string) => void; onBlur: () => void;
  error?: string; touched?: boolean;
  keyboardType?: any; autoCapitalize?: any;
  secureTextEntry?: boolean; rightEl?: React.ReactNode;
  multiline?: boolean; maxLength?: number; optional?: boolean;
  colors: any; s: ReturnType<typeof makeStyles>;
}

function FormField({ label, icon, placeholder, value, onChangeText, onBlur,
  error, touched, keyboardType = 'default', autoCapitalize = 'words',
  secureTextEntry = false, rightEl, multiline = false, maxLength,
  optional, colors, s,
}: FProps) {
  const [focused, setFocused] = useState(false);
  const showError = !!(touched && error);

  const lbl = (
    <Text style={s.fieldLabel}>
      {label}
      {optional && <Text style={s.fieldLabelOpt}> (optional)</Text>}
    </Text>
  );

  if (multiline) {
    return (
      <View style={s.fieldWrap}>
        {lbl}
        <TextInput
          style={[s.multiInput, focused && s.multiInputFocus, showError && s.multiInputError]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur(); }}
          multiline numberOfLines={3}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
        />
        {maxLength !== undefined && <Text style={s.charCount}>{value.length}/{maxLength}</Text>}
        {showError && <Text style={s.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={s.fieldWrap}>
      {lbl}
      <View style={[s.inputRow, focused && s.inputRowFocus, showError && s.inputRowError]}>
        <Ionicons name={icon as any} size={18} color={focused ? colors.primary : showError ? '#E74C3C' : colors.textMuted} />
        <TextInput
          style={s.textInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur(); }}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {rightEl}
      </View>
      {showError && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function SignUpScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuthStore();
  const s = makeStyles(colors);

  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState('#4A8FD9');
  const [gender, setGender]       = useState<SignUpData['gender']>(undefined);
  const [familyRole, setFamilyRole] = useState<NonNullable<SignUpData['familyRole']>>('parent');
  const [numChildren, setNumChildren] = useState(0);
  const [biometric, setBiometric] = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [showCpw, setShowCpw]     = useState(false);
  const [loading, setLoading]     = useState(false);

  const formikRef = useRef<FormikProps<FormValues>>(null);
  const step3Schema = React.useMemo(() => makeStep3Schema(t), [t]);

  // ── photo picker ──────────────────────────────────────────────────────────

  const pickPhoto = () => {
    Alert.alert(t('auth.screens.signUp.photoAlertTitle'), t('auth.screens.signUp.photoAlertMsg'), [
      {
        text: t('auth.screens.signUp.takePhoto'), onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert(t('auth.screens.signUp.permissionNeededTitle'), t('auth.screens.signUp.cameraPermissionMsg')); return; }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled && r.assets[0]) setAvatarUri(r.assets[0].uri);
        },
      },
      {
        text: t('auth.screens.signUp.chooseFromLibrary'), onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert(t('auth.screens.signUp.permissionNeededTitle'), t('auth.screens.signUp.libraryPermissionMsg')); return; }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled && r.assets[0]) setAvatarUri(r.assets[0].uri);
        },
      },
      { text: t('auth.screens.signUp.removePhoto'), style: 'destructive', onPress: () => setAvatarUri(null) },
      { text: t('auth.screens.signUp.cancel'), style: 'cancel' },
    ]);
  };

  // ── step advance (validates only the current step's fields) ───────────────

  const advanceStep = (fk: FormikProps<FormValues>, to: 2 | 3) => {
    if (to === 2) {
      // touch required step-1 fields so errors show
      fk.setFieldTouched('firstName', true);
      fk.setFieldTouched('lastName', true);
      fk.setFieldTouched('email', true);

      const errors: string[] = [];
      if (!fk.values.firstName.trim()) errors.push(t('auth.screens.signUp.firstNameRequired'));
      if (!fk.values.lastName.trim())  errors.push(t('auth.screens.signUp.lastNameRequired'));
      if (!fk.values.email.trim() || !fk.values.email.includes('@')) errors.push(t('auth.screens.signUp.validEmailRequired'));
      if (fk.values.dateOfBirth && !/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(fk.values.dateOfBirth)) {
        errors.push(t('auth.screens.signUp.dobFormatError'));
      }

      if (errors.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('auth.screens.signUp.fixFollowingTitle'), errors.join('\n'));
        return;
      }

      // auto-fill family name
      if (!fk.values.familyName) {
        const last = fk.values.lastName.trim() || fk.values.firstName.trim();
        fk.setFieldValue('familyName', `The ${last} Family`);
      }
    }

    if (to === 3) {
      fk.setFieldTouched('familyName', true);

      if (!fk.values.familyName.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('auth.screens.signUp.requiredTitle'), t('auth.screens.signUp.familyNameRequiredMsg'));
        return;
      }
      if (fk.values.zipCode && !/^\d{5}(-\d{4})?$/.test(fk.values.zipCode)) {
        Alert.alert(t('auth.screens.signUp.invalidZipTitle'), t('auth.screens.signUp.invalidZipMsg'));
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(to);
  };

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    const data: SignUpData = {
      displayName:  `${values.firstName.trim()} ${values.lastName.trim()}`,
      firstName:    values.firstName.trim(),
      lastName:     values.lastName.trim(),
      email:        values.email.trim().toLowerCase(),
      password:     values.password,
      phone:        values.phone || undefined,
      dateOfBirth:  values.dateOfBirth || undefined,
      gender,
      occupation:   values.occupation || undefined,
      bio:          values.bio || undefined,
      avatarUri:    avatarUri ?? undefined,
      avatarColor,
      familyName:   values.familyName || undefined,
      familyMotto:  values.familyMotto || undefined,
      familyRole,
      numberOfChildren: numChildren > 0 ? numChildren : undefined,
      streetAddress: values.streetAddress || undefined,
      city:          values.city || undefined,
      state:         values.state || undefined,
      zipCode:       values.zipCode || undefined,
      emergencyContactName:  values.ecName || undefined,
      emergencyContactPhone: values.ecPhone || undefined,
    };

    const result = await signUp(data);
    setLoading(false);

    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('auth.screens.signUp.signUpFailedTitle'), result.error ?? t('auth.screens.signUp.genericError'));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Store biometric preference and credentials if enabled
      if (biometric) {
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        await SecureStore.setItemAsync(
          'stored_credentials',
          JSON.stringify({ email: values.email.trim().toLowerCase(), password: values.password })
        );
      }
      // wipe all previous data before populating fresh family data
      resetAllStores();
      const { user } = useAuthStore.getState();
      if (user) await populateFromSignUp(user);
    }
  };

  // ── step bar ──────────────────────────────────────────────────────────────

  const StepBar = () => (
    <View style={s.stepRow}>
      {([
        t('auth.screens.signUp.stepYou'),
        t('auth.screens.signUp.stepFamily'),
        t('auth.screens.signUp.stepSecurity'),
      ] as const).map((label, idx) => {
        const n = idx + 1;
        const isActive = n === step;
        const isDone   = n < step;
        return (
          <React.Fragment key={n}>
            <View style={s.stepItem}>
              <View style={[s.stepBubble, (isActive || isDone) && s.stepBubbleOn]}>
                {isDone
                  ? <Ionicons name="checkmark" size={14} color="#fff" />
                  : <Text style={[s.stepBubbleText, isActive && s.stepBubbleTextOn]}>{n}</Text>
                }
              </View>
              <Text style={[s.stepLabel, isActive && s.stepLabelActive]}>{label}</Text>
            </View>
            {idx < 2 && <View style={[s.stepLine, isDone && s.stepLineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ── step 1 ────────────────────────────────────────────────────────────────

  const renderStep1 = (fk: FormikProps<FormValues>) => {
    const fi = fk.values.firstName.trim()[0] ?? '';
    const li = fk.values.lastName.trim()[0]  ?? '';
    const initials = (fi + li).toUpperCase() || '?';

    return (
      <>
        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionProfilePhoto')}</Text>
        <View style={s.avatarWrap}>
          <Pressable onPress={pickPhoto} style={{ position: 'relative' }}>
            <View style={[s.avatarCircle, { backgroundColor: avatarUri ? 'transparent' : avatarColor }]}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                : <Text style={s.avatarInitials}>{initials}</Text>
              }
            </View>
            <View style={s.cameraBtn}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </Pressable>
          <Text style={s.avatarHint}>{avatarUri ? t('auth.screens.signUp.tapToChange') : t('auth.screens.signUp.tapToAddPhoto')}</Text>
        </View>

        {!avatarUri && (
          <>
            <Text style={s.colorLabel}>{t('auth.screens.signUp.orChooseColor')}</Text>
            <View style={s.colorRow}>
              {AVATAR_COLORS.map(c => (
                <Pressable key={c}
                  style={[s.colorDot, { backgroundColor: c },
                    avatarColor === c && { borderWidth: 3, borderColor: '#fff', shadowColor: c, shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 },
                  ]}
                  onPress={() => setAvatarColor(c)}>
                  {avatarColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionPersonalInfo')}</Text>

        {/* First / Last name side-by-side */}
        <View style={s.halfRow}>
          <View style={s.halfField}>
            <FormField label={t('auth.screens.signUp.firstNameLabel')} icon="person-outline" placeholder={t('auth.screens.signUp.firstNamePlaceholder')}
              value={fk.values.firstName}
              onChangeText={val => fk.setFieldValue('firstName', val)}
              onBlur={() => fk.setFieldTouched('firstName', true)}
              error={fk.errors.firstName} touched={fk.touched.firstName}
              colors={colors} s={s} />
          </View>
          <View style={s.halfField}>
            <FormField label={t('auth.screens.signUp.lastNameLabel')} icon="person-outline" placeholder={t('auth.screens.signUp.lastNamePlaceholder')}
              value={fk.values.lastName}
              onChangeText={val => fk.setFieldValue('lastName', val)}
              onBlur={() => fk.setFieldTouched('lastName', true)}
              error={fk.errors.lastName} touched={fk.touched.lastName}
              colors={colors} s={s} />
          </View>
        </View>

        <FormField label={t('auth.screens.signUp.emailLabel')} icon="mail-outline" placeholder={t('auth.screens.signUp.emailPlaceholder')}
          value={fk.values.email}
          onChangeText={val => fk.setFieldValue('email', val)}
          onBlur={() => fk.setFieldTouched('email', true)}
          error={fk.errors.email} touched={fk.touched.email}
          keyboardType="email-address" autoCapitalize="none"
          colors={colors} s={s} />

        <FormField label={t('auth.screens.signUp.phoneLabel')} icon="call-outline" placeholder={t('auth.screens.signUp.phonePlaceholder')}
          value={fk.values.phone}
          onChangeText={val => fk.setFieldValue('phone', val)}
          onBlur={() => fk.setFieldTouched('phone', true)}
          error={fk.errors.phone} touched={fk.touched.phone}
          keyboardType="phone-pad" autoCapitalize="none" optional
          colors={colors} s={s} />

        <FormField label={t('auth.screens.signUp.dobLabel')} icon="calendar-outline" placeholder={t('auth.screens.signUp.dobPlaceholder')}
          value={fk.values.dateOfBirth}
          onChangeText={(raw) => {
            const digits = raw.replace(/\D/g, '').slice(0, 8);
            let formatted = digits;
            if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
            if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
            fk.setFieldValue('dateOfBirth', formatted);
          }}
          onBlur={() => fk.setFieldTouched('dateOfBirth', true)}
          error={fk.errors.dateOfBirth} touched={fk.touched.dateOfBirth}
          keyboardType="numeric" autoCapitalize="none" optional
          colors={colors} s={s} />

        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionGender')}</Text>
        <View style={[s.chipRow, { marginBottom: 16 }]}>
          {GENDER_OPTIONS.map(g => (
            <Pressable key={g.key}
              style={[s.chip, gender === g.key && s.chipOn]}
              onPress={() => setGender(prev => prev === g.key ? undefined : g.key)}>
              <Text style={[s.chipText, gender === g.key && s.chipTextOn]}>{t(g.labelKey)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionAboutYou')}</Text>
        <FormField label={t('auth.screens.signUp.occupationLabel')} icon="briefcase-outline" placeholder={t('auth.screens.signUp.occupationPlaceholder')}
          value={fk.values.occupation}
          onChangeText={val => fk.setFieldValue('occupation', val)}
          onBlur={() => fk.setFieldTouched('occupation', true)}
          error={fk.errors.occupation} touched={fk.touched.occupation}
          optional colors={colors} s={s} />

        <FormField label={t('auth.screens.signUp.bioLabel')} icon="chatbubble-ellipses-outline"
          placeholder={t('auth.screens.signUp.bioPlaceholder')}
          value={fk.values.bio}
          onChangeText={val => fk.setFieldValue('bio', val)}
          onBlur={() => fk.setFieldTouched('bio', true)}
          error={fk.errors.bio} touched={fk.touched.bio}
          multiline maxLength={300} optional colors={colors} s={s} />

        <Pressable style={s.fullBtn} onPress={() => advanceStep(fk, 2)}>
          <LinearGradient colors={['#1E4A8A', '#0F2952']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.fullBtnGrad}>
            <Text style={s.fullBtnText}>{t('auth.screens.signUp.nextFamilySetup')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>

        <View style={s.footerRow}>
          <Text style={s.footerText}>
            {t('auth.screens.signUp.alreadyHaveAccount')}{' '}
            <Text style={s.footerLink} onPress={() => navigation.navigate('SignIn')}>{t('auth.screens.signUp.signInLink')}</Text>
          </Text>
        </View>
      </>
    );
  };

  // ── step 2 ────────────────────────────────────────────────────────────────

  const renderStep2 = (fk: FormikProps<FormValues>) => (
    <>
      <Text style={s.secTitle}>{t('auth.screens.signUp.sectionFamilyDetails')}</Text>
      <FormField label={t('auth.screens.signUp.familyNameLabel')} icon="home-outline" placeholder={t('auth.screens.signUp.familyNamePlaceholder')}
        value={fk.values.familyName}
        onChangeText={val => fk.setFieldValue('familyName', val)}
        onBlur={() => fk.setFieldTouched('familyName', true)}
        error={fk.errors.familyName} touched={fk.touched.familyName}
        colors={colors} s={s} />

      <FormField label={t('auth.screens.signUp.familyMottoLabel')} icon="chatbox-ellipses-outline" placeholder={t('auth.screens.signUp.familyMottoPlaceholder')}
        value={fk.values.familyMotto}
        onChangeText={val => fk.setFieldValue('familyMotto', val)}
        onBlur={() => fk.setFieldTouched('familyMotto', true)}
        error={fk.errors.familyMotto} touched={fk.touched.familyMotto}
        optional colors={colors} s={s} />

      <Text style={s.secTitle}>{t('auth.screens.signUp.sectionYourRole')}</Text>
      <View style={s.roleGrid}>
        {ROLE_OPTIONS.map(opt => (
          <Pressable key={opt.key}
            style={[s.roleChip, familyRole === opt.key && s.roleChipOn]}
            onPress={() => setFamilyRole(opt.key)}>
            <Ionicons name={opt.icon as any} size={16} color={familyRole === opt.key ? '#fff' : colors.textSecondary} />
            <Text style={[s.roleChipText, familyRole === opt.key && s.roleChipTextOn]}>{t(opt.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[s.secTitle, { marginTop: 10 }]}>{t('auth.screens.signUp.sectionNumberOfChildren')}</Text>
      <View style={s.fieldWrap}>
        <View style={s.stepperRow}>
          <Ionicons name="people-outline" size={18} color={colors.textMuted} />
          <Text style={s.stepperLabel}>
            {numChildren === 0 ? t('auth.screens.signUp.none') : t('auth.screens.signUp.child', { count: numChildren })}
          </Text>
          <View style={s.stepperControls}>
            <Pressable style={s.stepperBtn} onPress={() => setNumChildren(n => Math.max(0, n - 1))}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Text style={s.stepperVal}>{numChildren}</Text>
            <Pressable style={s.stepperBtn} onPress={() => setNumChildren(n => n + 1)}>
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <Text style={[s.secTitle, { marginTop: 6 }]}>{t('auth.screens.signUp.sectionHomeAddress')}</Text>
      <FormField label={t('auth.screens.signUp.streetAddressLabel')} icon="location-outline" placeholder={t('auth.screens.signUp.streetAddressPlaceholder')}
        value={fk.values.streetAddress}
        onChangeText={val => fk.setFieldValue('streetAddress', val)}
        onBlur={() => fk.setFieldTouched('streetAddress', true)}
        error={fk.errors.streetAddress} touched={fk.touched.streetAddress}
        optional colors={colors} s={s} />

      <FormField label={t('auth.screens.signUp.cityLabel')} icon="business-outline" placeholder={t('auth.screens.signUp.cityPlaceholder')}
        value={fk.values.city}
        onChangeText={val => fk.setFieldValue('city', val)}
        onBlur={() => fk.setFieldTouched('city', true)}
        error={fk.errors.city} touched={fk.touched.city}
        optional colors={colors} s={s} />

      <View style={s.halfRow}>
        <View style={s.halfField}>
          <FormField label={t('auth.screens.signUp.stateLabel')} icon="map-outline" placeholder={t('auth.screens.signUp.statePlaceholder')}
            value={fk.values.state}
            onChangeText={val => fk.setFieldValue('state', val.toUpperCase().slice(0, 2))}
            onBlur={() => fk.setFieldTouched('state', true)}
            error={fk.errors.state} touched={fk.touched.state}
            autoCapitalize="characters" optional colors={colors} s={s} />
        </View>
        <View style={s.halfField}>
          <FormField label={t('auth.screens.signUp.zipCodeLabel')} icon="mail-outline" placeholder={t('auth.screens.signUp.zipCodePlaceholder')}
            value={fk.values.zipCode}
            onChangeText={val => fk.setFieldValue('zipCode', val)}
            onBlur={() => fk.setFieldTouched('zipCode', true)}
            error={fk.errors.zipCode} touched={fk.touched.zipCode}
            keyboardType="numeric" autoCapitalize="none" optional
            colors={colors} s={s} />
        </View>
      </View>

      <Text style={[s.secTitle, { marginTop: 6 }]}>{t('auth.screens.signUp.sectionEmergencyContact')}</Text>
      <FormField label={t('auth.screens.signUp.contactNameLabel')} icon="person-add-outline" placeholder={t('auth.screens.signUp.contactNamePlaceholder')}
        value={fk.values.ecName}
        onChangeText={val => fk.setFieldValue('ecName', val)}
        onBlur={() => fk.setFieldTouched('ecName', true)}
        error={fk.errors.ecName} touched={fk.touched.ecName}
        optional colors={colors} s={s} />

      <FormField label={t('auth.screens.signUp.contactPhoneLabel')} icon="call-outline" placeholder={t('auth.screens.signUp.contactPhonePlaceholder')}
        value={fk.values.ecPhone}
        onChangeText={val => fk.setFieldValue('ecPhone', val)}
        onBlur={() => fk.setFieldTouched('ecPhone', true)}
        error={fk.errors.ecPhone} touched={fk.touched.ecPhone}
        keyboardType="phone-pad" autoCapitalize="none" optional
        colors={colors} s={s} />

      <View style={s.navRow}>
        <Pressable style={s.backBtn} onPress={() => setStep(1)}>
          <Text style={s.backBtnText}>{t('auth.screens.signUp.backButton')}</Text>
        </Pressable>
        <Pressable style={s.nextBtn} onPress={() => advanceStep(fk, 3)}>
          <LinearGradient colors={['#1E4A8A', '#0F2952']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
            <Text style={s.nextBtnText}>{t('auth.screens.signUp.nextSecurity')}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </>
  );

  // ── step 3 ────────────────────────────────────────────────────────────────

  const renderStep3 = (fk: FormikProps<FormValues>) => {
    const str = pwStrength(fk.values.password, t);
    const pwMatch   = fk.values.confirmPw.length > 0 && fk.values.password === fk.values.confirmPw;
    const pwNoMatch = fk.values.confirmPw.length > 0 && fk.values.password !== fk.values.confirmPw;

    return (
      <>
        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionCreatePassword')}</Text>

        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>{t('auth.password')}</Text>
          <View style={[s.inputRow, fk.touched.password && fk.errors.password ? s.inputRowError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={s.textInput}
              placeholder={t('auth.screens.signUp.passwordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={fk.values.password}
              onChangeText={val => fk.setFieldValue('password', val)}
              onBlur={() => fk.setFieldTouched('password', true)}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {fk.values.password.length > 0 && (
            <>
              <View style={s.strengthBar}>
                <View style={[s.strengthFill, { width: `${str.pct * 100}%` as any, backgroundColor: str.color }]} />
              </View>
              <Text style={[s.strengthLabel, { color: str.color }]}>{str.label}</Text>
            </>
          )}
          {fk.touched.password && fk.errors.password && <Text style={s.errorText}>{fk.errors.password}</Text>}
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>{t('auth.screens.signUp.confirmPasswordLabel')}</Text>
          <View style={[s.inputRow, fk.touched.confirmPw && fk.errors.confirmPw ? s.inputRowError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={s.textInput}
              placeholder={t('auth.screens.signUp.confirmPasswordPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={fk.values.confirmPw}
              onChangeText={val => fk.setFieldValue('confirmPw', val)}
              onBlur={() => fk.setFieldTouched('confirmPw', true)}
              secureTextEntry={!showCpw}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={s.eyeBtn} onPress={() => setShowCpw(v => !v)}>
              <Ionicons name={showCpw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {pwMatch   && <Text style={[s.matchHint, { color: '#27AE60' }]}>{t('auth.screens.signUp.passwordsMatch')}</Text>}
          {pwNoMatch && <Text style={[s.matchHint, { color: '#E74C3C' }]}>{t('auth.screens.signUp.passwordsNoMatch')}</Text>}
          {fk.touched.confirmPw && fk.errors.confirmPw && <Text style={s.errorText}>{fk.errors.confirmPw}</Text>}
        </View>

        <Text style={[s.secTitle, { marginTop: 4 }]}>{t('auth.screens.signUp.sectionSecurityOptions')}</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleLeft}>
            <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
            <Text style={s.toggleLabel}>{t('auth.screens.signUp.enableBiometric')}</Text>
          </View>
          <Switch value={biometric} onValueChange={setBiometric}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={biometric ? colors.primary : colors.textMuted} />
        </View>

        <Text style={[s.secTitle, { marginTop: 16 }]}>{t('auth.screens.signUp.sectionTerms')}</Text>
        <Pressable style={s.termsRow} onPress={() => fk.setFieldValue('agreed', !fk.values.agreed)}>
          <View style={[s.checkbox, fk.values.agreed && s.checkboxOn]}>
            {fk.values.agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={s.termsText}>
            {t('auth.screens.signUp.agreeToThe')}{' '}
            <Text style={s.termsLink} onPress={() => navigation.navigate('TermsOfService')}>{t('auth.screens.signUp.termsOfService')}</Text>
            {' '}{t('auth.screens.signUp.and')}{' '}
            <Text style={s.termsLink} onPress={() => navigation.navigate('PrivacyPolicy')}>{t('auth.screens.signUp.privacyPolicy')}</Text>
          </Text>
        </Pressable>
        {fk.touched.agreed && fk.errors.agreed && <Text style={s.errorText}>{String(fk.errors.agreed)}</Text>}

        <View style={s.navRow}>
          <Pressable style={s.backBtn} onPress={() => setStep(2)}>
            <Text style={s.backBtnText}>{t('auth.screens.signUp.backButton')}</Text>
          </Pressable>
          <Pressable style={s.nextBtn} disabled={loading} onPress={() => fk.handleSubmit()}>
            <LinearGradient colors={['#F5A623', '#FF8C42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.nextBtnText}>{t('auth.createAccount')}</Text>
              }
            </LinearGradient>
          </Pressable>
        </View>
      </>
    );
  };

  // ── root ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#040D1A', '#0A1E3D', '#0F2952']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={s.orb1} /><View style={s.orb2} />

      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Formik
            innerRef={formikRef}
            initialValues={INITIAL}
            validationSchema={step === 3 ? step3Schema : undefined}
            validateOnBlur
            validateOnChange={false}
            onSubmit={handleSubmit}
          >
            {(fk) => (
              <View style={s.card}>
                <StepBar />
                {step === 1 && renderStep1(fk)}
                {step === 2 && renderStep2(fk)}
                {step === 3 && renderStep3(fk)}
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
