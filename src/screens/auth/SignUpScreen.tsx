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
import { uploadImageToR2 } from '../../services/uploadService';
import { useTranslation } from 'react-i18next';
import { validatePasswordStrength } from '../../utils/passwordPolicy';
import { TurnstileWidget } from '../../components/common/TurnstileWidget';
import { TURNSTILE_SITE_KEY } from '../../config/turnstile';

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
      .test('strength', t('auth.screens.signUp.yupPasswordStrength'), (v) => !v || validatePasswordStrength(v).valid)
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
  if (!validatePasswordStrength(pw).valid) return { label: t('auth.screens.signUp.strengthWeak'), color: '#E74C3C', pct: 0.25 };
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const long = pw.length >= 14;
  if (long && hasSpecial) return { label: t('auth.screens.signUp.strengthStrong'), color: '#27AE60', pct: 1.0 };
  return { label: t('auth.screens.signUp.strengthMedium'), color: '#F5A623', pct: 0.60 };
}

// ─── makeStyles ───────────────────────────────────────────────────────────────

// Enterprise-grade sign-up redesign: a restrained, structured look (light
// neutral page, solid navy actions, hairline dividers, slim segmented
// progress) in place of the previous dark-gradient hero + heavy-shadow
// card + gradient buttons. Kept local to this screen rather than folded
// into the shared theme, since it's a deliberate departure from the rest
// of the app's (still gradient-heavy) visual language.
const ENT = {
  navy: '#0F2952',
  ink: '#101828',
  ink2: '#475467',
  ink3: '#98A2B3',
  line: '#E4E7EC',
  line2: '#EAECF0',
  surface: '#FFFFFF',
  page: '#F9FAFB',
  danger: '#D92D20',
  success: '#16794F',
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: ENT.page },
    kav: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    // top bar: brand + progress
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
    brandMark: { width: 22, height: 22, borderRadius: 6, backgroundColor: ENT.navy, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: 13, fontWeight: '700', color: ENT.ink },
    progressTrack: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    progressSeg: { height: 3, borderRadius: 2, flex: 1, backgroundColor: ENT.line },
    progressSegOn: { backgroundColor: ENT.navy },
    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 },
    progressStep: { fontSize: 12, fontWeight: '600', color: ENT.ink2 },
    progressStepOn: { color: ENT.navy, fontWeight: '700' },
    progressCount: { fontSize: 12, color: ENT.ink3 },
    // screen title
    h1: { fontSize: 22, fontWeight: '700', color: ENT.ink, marginBottom: 4, letterSpacing: -0.2 },
    subtitle: { fontSize: 13.5, color: ENT.ink2, marginBottom: 26, lineHeight: 19 },
    // section title + dividers
    secTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: ENT.ink3, marginBottom: 14 },
    divider: { height: 1, backgroundColor: ENT.line2, marginVertical: 26 },
    // avatar
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    avatarCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 72, height: 72, borderRadius: 36 },
    avatarInitials: { fontSize: 24, fontWeight: '700', color: '#fff' },
    avatarActions: { flex: 1, gap: 8 },
    avatarActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 38, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: ENT.line, backgroundColor: ENT.surface },
    avatarActionText: { fontSize: 13, fontWeight: '600', color: ENT.ink },
    removePhotoLink: { fontSize: 12.5, fontWeight: '600', color: ENT.danger },
    swatchLabel: { fontSize: 12.5, color: ENT.ink3, marginBottom: 8 },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    colorDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    // field
    fieldWrap: { marginBottom: 14 },
    fieldLabel: { fontSize: 12.5, fontWeight: '600', color: ENT.ink2, marginBottom: 6 },
    fieldLabelOpt: { fontWeight: '400', color: ENT.ink3 },
    inputRow: {
      flexDirection: 'row', alignItems: 'center', height: 46,
      borderRadius: 9, borderWidth: 1, borderColor: ENT.line,
      paddingHorizontal: 13, backgroundColor: ENT.surface,
    },
    inputRowFocus: { borderColor: ENT.navy },
    inputRowError: { borderColor: ENT.danger },
    textInput: { flex: 1, fontSize: 14.5, color: ENT.ink, marginLeft: 10, paddingVertical: 0 },
    multiInput: {
      borderRadius: 9, borderWidth: 1, borderColor: ENT.line,
      paddingHorizontal: 13, paddingVertical: 12, fontSize: 14.5,
      color: ENT.ink, minHeight: 76, textAlignVertical: 'top',
      backgroundColor: ENT.surface,
    },
    multiInputFocus: { borderColor: ENT.navy },
    multiInputError: { borderColor: ENT.danger },
    eyeBtn: { padding: 4 },
    errorText: { fontSize: 12, color: ENT.danger, marginTop: 4, marginLeft: 2 },
    charCount: { fontSize: 11, color: ENT.ink3, textAlign: 'right', marginTop: 3 },
    halfRow: { flexDirection: 'row', gap: 12 },
    halfField: { flex: 1 },
    // chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: ENT.line, backgroundColor: ENT.surface },
    chipOn: { backgroundColor: ENT.navy, borderColor: ENT.navy },
    chipText: { fontSize: 13, fontWeight: '600', color: ENT.ink },
    chipTextOn: { color: '#fff' },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    roleChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 11, borderRadius: 9,
      borderWidth: 1, borderColor: ENT.line, backgroundColor: ENT.surface,
      minWidth: '45%', flexGrow: 1,
    },
    roleChipFull: { minWidth: '100%' },
    roleChipOn: { backgroundColor: ENT.navy, borderColor: ENT.navy },
    roleChipText: { fontSize: 13, fontWeight: '600', color: ENT.ink },
    roleChipTextOn: { color: '#fff' },
    // stepper
    stepperRow: {
      flexDirection: 'row', alignItems: 'center', height: 46,
      borderRadius: 9, borderWidth: 1, borderColor: ENT.line,
      paddingHorizontal: 13, backgroundColor: ENT.surface,
    },
    stepperLabel: { flex: 1, fontSize: 14.5, marginLeft: 10, color: ENT.ink },
    stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepperBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: ENT.line, alignItems: 'center', justifyContent: 'center' },
    stepperVal: { fontSize: 15, fontWeight: '700', color: ENT.ink, minWidth: 16, textAlign: 'center' },
    // toggle
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: ENT.line2 },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    toggleLabel: { fontSize: 14.5, fontWeight: '600', color: ENT.ink },
    // terms
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 24 },
    checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: ENT.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkboxOn: { backgroundColor: ENT.navy, borderColor: ENT.navy },
    termsText: { flex: 1, fontSize: 13, color: ENT.ink2, lineHeight: 19 },
    termsLink: { color: ENT.navy, fontWeight: '600' },
    // strength
    strengthBar: { height: 4, borderRadius: 2, marginTop: 10, backgroundColor: ENT.line, overflow: 'hidden' },
    strengthFill: { height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 11.5, marginTop: 6, fontWeight: '600' },
    matchHint: { fontSize: 12, marginTop: 8, fontWeight: '600' },
    // nav
    navRow: { flexDirection: 'row', gap: 12, marginTop: 26 },
    backBtn: { flex: 1, height: 50, borderRadius: 10, borderWidth: 1, borderColor: ENT.line, backgroundColor: ENT.surface, alignItems: 'center', justifyContent: 'center' },
    backBtnText: { fontSize: 14.5, fontWeight: '600', color: ENT.ink2 },
    nextBtn: { flex: 2, height: 50, borderRadius: 10, backgroundColor: ENT.navy, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    nextBtnDisabled: { opacity: 0.5 },
    nextBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    turnstileErrorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, marginBottom: 8 },
    turnstileErrorText: { fontSize: 12.5, color: '#E74C3C' },
    turnstileRetryText: { fontSize: 12.5, fontWeight: '700', color: ENT.navy },
    fullBtn: { height: 50, borderRadius: 10, backgroundColor: ENT.navy, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6 },
    fullBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    footerRow: { alignItems: 'center', marginTop: 22 },
    footerText: { fontSize: 13.5, color: ENT.ink2 },
    footerLink: { fontWeight: '700', color: ENT.navy },
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
        <TextInput accessibilityLabel={placeholder}
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
        <TextInput accessibilityLabel={placeholder}
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
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  // 'error' surfaces when the widget hangs or Cloudflare reports a failure —
  // otherwise the user was stuck on Cloudflare's own indefinite "Verifying..."
  // spinner with no feedback and no way to retry.
  const [turnstileStatus, setTurnstileStatus] = useState<'pending' | 'error'>('pending');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const turnstileRequired = !!TURNSTILE_SITE_KEY;

  const formikRef = useRef<FormikProps<FormValues>>(null);
  const step3Schema = React.useMemo(() => makeStep3Schema(t), [t]);

  // ── photo picker ──────────────────────────────────────────────────────────
  // Split into two explicit, always-visible actions (rather than one tap
  // target that opens a native action-sheet Alert) so both paths — camera
  // and gallery — are discoverable without a hidden menu.

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('auth.screens.signUp.permissionNeededTitle'), t('auth.screens.signUp.cameraPermissionMsg')); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled && r.assets[0]) setAvatarUri(r.assets[0].uri);
  };

  const chooseFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('auth.screens.signUp.permissionNeededTitle'), t('auth.screens.signUp.libraryPermissionMsg')); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!r.canceled && r.assets[0]) setAvatarUri(r.assets[0].uri);
  };

  // ── step advance (validates only the current step's fields, via the
  // per-step Yup schema Formik is already validating against — see the
  // validationSchema prop below) ─────────────────────────────────────────

  const STEP_FIELDS: Record<1 | 2, (keyof FormValues)[]> = {
    1: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'occupation', 'bio'],
    2: ['familyName', 'familyMotto', 'streetAddress', 'city', 'state', 'zipCode', 'ecName', 'ecPhone'],
  };

  const advanceStep = async (fk: FormikProps<FormValues>, to: 2 | 3) => {
    const fields = STEP_FIELDS[to === 2 ? 1 : 2];
    fields.forEach((f) => fk.setFieldTouched(f, true, false));

    const errors = await fk.validateForm();
    if (fields.some((f) => errors[f])) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (to === 2 && !fk.values.familyName) {
      const last = fk.values.lastName.trim() || fk.values.firstName.trim();
      fk.setFieldValue('familyName', `The ${last} Family`);
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
      turnstileToken,
    };

    const result = await signUp(data);

    if (!result.success) {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('auth.screens.signUp.signUpFailedTitle'), result.error ?? t('auth.screens.signUp.genericError'));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Remember the opt-in only — never the password itself. Biometric
      // sign-in re-enters the session SecureStore already holds the tokens
      // for (see useAuthStore.unlockWithBiometric), it doesn't re-derive
      // credentials from anything stored here.
      if (biometric) {
        await SecureStore.setItemAsync('biometric_enabled', 'true');
      }
      // wipe all previous data before populating fresh family data
      resetAllStores();
      const { user } = useAuthStore.getState();
      if (user) {
        let finalUser = user;
        // The avatar was picked (and held as a local file:// URI) before the
        // account existed, so there was nowhere authenticated to upload it
        // to yet — signUp() has since linked a real backend session, so
        // upload it now and use the resulting R2 key instead of the local
        // URI, which would only ever resolve on this one device.
        if (user.avatarUri?.startsWith('file://')) {
          try {
            const key = await uploadImageToR2(user.avatarUri, 'avatar');
            finalUser = { ...user, avatarUri: key };
            useAuthStore.getState().updateProfile({ avatarUri: key });
          } catch {
            finalUser = { ...user, avatarUri: undefined };
            useAuthStore.getState().updateProfile({ avatarUri: undefined });
          }
        }
        await populateFromSignUp(finalUser);

        // Only now does the app switch away from the auth flow —
        // isAuthenticated is withheld by useAuthStore.signUp() specifically
        // so this doesn't happen until family/member data has actually been
        // hydrated above. Flipping it earlier (it used to be set inside
        // signUp() itself) let the dashboard and RoleGuard-gated tabs
        // (Finance/Operations) render one frame against resetAllStores()'s
        // blank slate — no family name, and "Operations Restricted" even for
        // a freshly-registered parent, until something else happened to
        // trigger a second, successful fetch. Scoped inside `if (user)` —
        // the pending-email-verification path (no `user` yet) must NOT
        // become authenticated here.
        useAuthStore.setState({ isAuthenticated: true });
      }
      setLoading(false);
    }
  };

  // ── top bar: brand + slim segmented progress ────────────────────────────

  const STEP_TITLES = [
    t('auth.screens.signUp.stepYou'),
    t('auth.screens.signUp.stepFamily'),
    t('auth.screens.signUp.stepSecurity'),
  ];

  const TopBar = () => (
    <>
      <View style={s.brandRow}>
        <View style={s.brandMark}>
          <Ionicons name="home" size={12} color="#fff" />
        </View>
        <Text style={s.brandName}>{t('appName', { defaultValue: 'Family Command Center' })}</Text>
      </View>
      <View style={s.progressTrack}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[s.progressSeg, n <= step && s.progressSegOn]} />
        ))}
      </View>
      <View style={s.progressLabelRow}>
        <Text style={s.progressStep}>
          {STEP_TITLES.map((label, idx) => (
            <Text key={label} style={idx + 1 === step ? s.progressStepOn : undefined}>
              {idx > 0 ? '   ·   ' : ''}{label}
            </Text>
          ))}
        </Text>
        <Text style={s.progressCount}>{t('auth.screens.signUp.stepCount', { step, total: 3, defaultValue: `Step ${step} of 3` })}</Text>
      </View>
    </>
  );

  // ── step 1 ────────────────────────────────────────────────────────────────

  const renderStep1 = (fk: FormikProps<FormValues>) => {
    const fi = fk.values.firstName.trim()[0] ?? '';
    const li = fk.values.lastName.trim()[0]  ?? '';
    const initials = (fi + li).toUpperCase() || '?';

    return (
      <>
        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionProfilePhoto')}</Text>
        <View style={s.avatarRow}>
          <View style={[s.avatarCircle, { backgroundColor: avatarUri ? 'transparent' : avatarColor }]}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
              : <Text style={s.avatarInitials}>{initials}</Text>
            }
          </View>
          <View style={s.avatarActions}>
            <Pressable accessibilityRole="button" style={s.avatarActionBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={16} color={ENT.ink2} />
              <Text style={s.avatarActionText}>{t('auth.screens.signUp.takePhoto')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={s.avatarActionBtn} onPress={chooseFromGallery}>
              <Ionicons name="image-outline" size={16} color={ENT.ink2} />
              <Text style={s.avatarActionText}>{t('auth.screens.signUp.chooseFromLibrary')}</Text>
            </Pressable>
            {avatarUri && (
              <Pressable accessibilityRole="button" onPress={() => setAvatarUri(null)}>
                <Text style={s.removePhotoLink}>{t('auth.screens.signUp.removePhoto')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!avatarUri && (
          <>
            <Text style={s.swatchLabel}>{t('auth.screens.signUp.orChooseColor')}</Text>
            <View style={s.colorRow}>
              {AVATAR_COLORS.map(c => (
                <Pressable accessibilityRole="button" key={c}
                  style={[s.colorDot, { backgroundColor: c },
                    avatarColor === c && { borderWidth: 2, borderColor: ENT.page, shadowColor: ENT.navy, shadowOpacity: 0.5, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
                  ]}
                  onPress={() => setAvatarColor(c)}>
                  {avatarColor === c && <Ionicons name="checkmark" size={12} color="#fff" />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={s.divider} />

        {/* First / Last name side-by-side */}
        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionPersonalInfo')}</Text>
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

        <View style={s.divider} />

        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionGender')}</Text>
        <View style={[s.chipRow, { marginBottom: 16 }]}>
          {GENDER_OPTIONS.map(g => (
            <Pressable accessibilityRole="button" key={g.key}
              style={[s.chip, gender === g.key && s.chipOn]}
              onPress={() => setGender(prev => prev === g.key ? undefined : g.key)}>
              <Text style={[s.chipText, gender === g.key && s.chipTextOn]}>{t(g.labelKey)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.divider} />

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

        <Pressable accessibilityRole="button" style={s.fullBtn} onPress={() => advanceStep(fk, 2)}>
          <Text style={s.fullBtnText}>{t('auth.screens.signUp.nextFamilySetup')}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
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

      <View style={s.divider} />

      <Text style={s.secTitle}>{t('auth.screens.signUp.sectionYourRole')}</Text>
      <View style={s.roleGrid}>
        {ROLE_OPTIONS.map((opt, idx) => (
          <Pressable accessibilityRole="button" key={opt.key}
            style={[s.roleChip, idx === ROLE_OPTIONS.length - 1 && ROLE_OPTIONS.length % 2 === 1 && s.roleChipFull, familyRole === opt.key && s.roleChipOn]}
            onPress={() => setFamilyRole(opt.key)}>
            <Ionicons name={opt.icon as any} size={16} color={familyRole === opt.key ? '#fff' : colors.textSecondary} />
            <Text style={[s.roleChipText, familyRole === opt.key && s.roleChipTextOn]}>{t(opt.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.divider} />

      <Text style={s.secTitle}>{t('auth.screens.signUp.sectionNumberOfChildren')}</Text>
      <View style={s.fieldWrap}>
        <View style={s.stepperRow}>
          <Ionicons name="people-outline" size={18} color={colors.textMuted} />
          <Text style={s.stepperLabel}>
            {numChildren === 0 ? t('auth.screens.signUp.none') : t('auth.screens.signUp.child', { count: numChildren })}
          </Text>
          <View style={s.stepperControls}>
            <Pressable accessibilityRole="button" style={s.stepperBtn} onPress={() => setNumChildren(n => Math.max(0, n - 1))}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Text style={s.stepperVal}>{numChildren}</Text>
            <Pressable accessibilityRole="button" style={s.stepperBtn} onPress={() => setNumChildren(n => n + 1)}>
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={s.divider} />

      <Text style={s.secTitle}>{t('auth.screens.signUp.sectionHomeAddress')}</Text>
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

      <View style={s.divider} />

      <Text style={s.secTitle}>{t('auth.screens.signUp.sectionEmergencyContact')}</Text>
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
        <Pressable accessibilityRole="button" style={s.backBtn} onPress={() => setStep(1)}>
          <Text style={s.backBtnText}>{t('auth.screens.signUp.backButton')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={s.nextBtn} onPress={() => advanceStep(fk, 3)}>
          <Text style={s.nextBtnText}>{t('auth.screens.signUp.nextSecurity')}</Text>
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
            <TextInput accessibilityLabel={t('auth.screens.signUp.passwordPlaceholder')}
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
            <Pressable accessibilityRole="button" style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
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
            <TextInput accessibilityLabel={t('auth.screens.signUp.confirmPasswordPlaceholder')}
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
            <Pressable accessibilityRole="button" style={s.eyeBtn} onPress={() => setShowCpw(v => !v)}>
              <Ionicons name={showCpw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {pwMatch   && <Text style={[s.matchHint, { color: '#27AE60' }]}>{t('auth.screens.signUp.passwordsMatch')}</Text>}
          {pwNoMatch && <Text style={[s.matchHint, { color: '#E74C3C' }]}>{t('auth.screens.signUp.passwordsNoMatch')}</Text>}
          {fk.touched.confirmPw && fk.errors.confirmPw && <Text style={s.errorText}>{fk.errors.confirmPw}</Text>}
        </View>

        <View style={s.divider} />

        <Text style={s.secTitle}>{t('auth.screens.signUp.sectionSecurityOptions')}</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleLeft}>
            <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
            <Text style={s.toggleLabel}>{t('auth.screens.signUp.enableBiometric')}</Text>
          </View>
          <Switch value={biometric} onValueChange={setBiometric}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={biometric ? colors.primary : colors.textMuted} />
        </View>

        <TurnstileWidget
          key={turnstileKey}
          onToken={(tok) => { setTurnstileToken(tok); setTurnstileStatus('pending'); }}
          onExpire={() => setTurnstileToken(undefined)}
          onError={() => { setTurnstileToken(undefined); setTurnstileStatus('error'); }}
        />
        {turnstileRequired && turnstileStatus === 'error' && (
          <View style={s.turnstileErrorRow}>
            <Text style={s.turnstileErrorText}>{t('auth.screens.signUp.turnstileError', { defaultValue: "Couldn't complete the security check." })}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setTurnstileStatus('pending'); setTurnstileKey((k) => k + 1); }}
            >
              <Text style={s.turnstileRetryText}>{t('auth.screens.signUp.turnstileRetry', { defaultValue: 'Retry' })}</Text>
            </Pressable>
          </View>
        )}

        <Text style={[s.secTitle, { marginTop: 16 }]}>{t('auth.screens.signUp.sectionTerms')}</Text>
        <Pressable accessibilityRole="button" style={s.termsRow} onPress={() => fk.setFieldValue('agreed', !fk.values.agreed)}>
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
          <Pressable accessibilityRole="button" style={s.backBtn} onPress={() => setStep(2)}>
            <Text style={s.backBtnText}>{t('auth.screens.signUp.backButton')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[s.nextBtn, (loading || (turnstileRequired && !turnstileToken)) && s.nextBtnDisabled]}
            disabled={loading || (turnstileRequired && !turnstileToken)}
            onPress={() => fk.handleSubmit()}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.nextBtnText}>{t('auth.createAccount')}</Text>
            }
          </Pressable>
        </View>
      </>
    );
  };

  // ── root ──────────────────────────────────────────────────────────────────

  const STEP_HEADERS: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
    1: { title: t('auth.screens.signUp.headerYouTitle', { defaultValue: 'Create your account' }), subtitle: t('auth.screens.signUp.headerYouSubtitle', { defaultValue: 'Tell us a bit about yourself. Only your name and email are required — everything else can be filled in later.' }) },
    2: { title: t('auth.screens.signUp.headerFamilyTitle', { defaultValue: 'Set up your family' }), subtitle: t('auth.screens.signUp.headerFamilySubtitle', { defaultValue: "This creates your household — you can invite the rest of your family once you're in." }) },
    3: { title: t('auth.screens.signUp.headerSecurityTitle', { defaultValue: 'Secure your account' }), subtitle: t('auth.screens.signUp.headerSecuritySubtitle', { defaultValue: "Choose a strong password — you'll use this alongside Face ID or Touch ID once enabled." }) },
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TopBar />
          <Text style={s.h1}>{STEP_HEADERS[step].title}</Text>
          <Text style={s.subtitle}>{STEP_HEADERS[step].subtitle}</Text>

          <Formik
            innerRef={formikRef}
            initialValues={INITIAL}
            validationSchema={step === 1 ? step1Schema : step === 2 ? step2Schema : step3Schema}
            validateOnBlur
            validateOnChange={false}
            onSubmit={handleSubmit}
          >
            {(fk) => (
              <>
                {step === 1 && renderStep1(fk)}
                {step === 2 && renderStep2(fk)}
                {step === 3 && renderStep3(fk)}
              </>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
