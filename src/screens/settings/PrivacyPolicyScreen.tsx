import React from 'react';
import { LegalDocumentLayout, LegalSection } from '../../components/common/LegalDocumentLayout';
import { useTranslation } from 'react-i18next';

const LAST_UPDATED = 'August 31, 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Information We Collect',
    body: [
      'Family Command Center is a household management app. Most of what you enter — family member profiles, tasks, calendars, budgets, and so on — is data you and your family members create directly while using the app.',
    ],
    bullets: [
      'Account information: your email address and password, or your Apple ID if you sign in with Apple.',
      'Family and member profiles: names, birthdates, avatar colors, and roles (parent, child, or guardian) for each family member you add.',
      'Financial data: account balances and transactions if you connect a bank account through Plaid, plus any budgets, bills, subscriptions, debts, assets, and financial goals you enter manually.',
      'Location data: only for features you explicitly set up, such as geofence zones (home, school, work) or a linked child device in the Guardian feature. We do not track your location in the background outside of these features.',
      'Health information: medications, sleep logs, workout logs, and mood entries you choose to record in the Health Hub.',
      'Photos and documents: images you attach as proof of a completed task, and files you upload to the Document Vault, via your camera, photo library, or device file picker.',
      'Contacts: only if you choose to invite a family member and grant contacts access to make that easier.',
      'Voice input: speech is converted to text using your device\'s operating system speech-recognition service (which, depending on your device, may process audio on-device or on that OS provider\'s own servers) for voice input to the AI Assistant. We do not receive, store, or transmit audio recordings ourselves.',
      'AI Assistant conversations: the questions you ask and the family context needed to answer them (e.g. upcoming bills, tasks) are sent to our AI provider (Google Gemini) to generate a response.',
      'Support messages: anything you submit through Help & Support tickets or Live Chat, so our support team can respond to you.',
      'Push notification tokens: used only to deliver notifications you\'ve enabled (bill reminders, task alerts, Guardian alerts, etc.).',
      'Household connections: if you connect with another household through Family Connect, or grant/receive co-parent access to a shared custody calendar, we share the specific profile, calendar, and post information needed to make that connection work with the members of that other household.',
      'Sign-up verification signals: when you create an account, Cloudflare Turnstile checks device and browser signals to confirm you\'re not a bot. We only receive a pass/fail result — we don\'t see or store the underlying signals ourselves.',
    ],
  },
  {
    heading: 'How We Use Your Information',
    body: ['We use the information above only to run the features you use:'],
    bullets: [
      'To display your family\'s tasks, calendar, budget, health, and other data back to you and the family members you\'ve added.',
      'To connect to your bank via Plaid and keep your account balances and transactions up to date, if you choose to link an account.',
      'To generate AI Assistant responses grounded in your family\'s real data.',
      'To send the notifications you\'ve turned on in Settings.',
      'To respond to support tickets and Live Chat messages.',
      'To process subscription purchases through the Apple App Store or Google Play (via RevenueCat) — we never see or store your card number.',
      'To share the relevant profile, calendar, or post information with a connected household or co-parent, only if and when you choose to connect with them.',
      'To protect sign-up from bots and automated abuse.',
    ],
  },
  {
    heading: 'Where Your Data Is Stored',
    body: [
      'Your family\'s data is stored on our backend servers so it can sync in real time across your devices and power the app\'s features — this is true for account, family, task, calendar, finance, and other core data, not just optional features. Some data is also cached locally on your device for offline access and performance. Photos you upload (task-completion photos, avatars, scanned receipts) are stored in encrypted cloud storage; Document Vault files stay only on your device — we sync just the document\'s title, category, and other details, not the file itself.',
    ],
  },
  {
    heading: 'Data Sharing',
    body: [
      'We do not sell your personal information. We share data only with the service providers needed to operate the app, and only for that purpose:',
    ],
    bullets: [
      'Plaid, Inc. — to securely connect and read your linked bank accounts.',
      'RevenueCat and the Apple App Store / Google Play — to process and manage subscription purchases.',
      'Google (Gemini) — to generate AI Assistant responses.',
      'Cloudflare — to protect sign-up from bots (Turnstile) and to store uploaded photos and documents securely (R2 storage).',
      'Railway and our database provider — to host and back up your account data securely.',
      'Members of a household you\'ve connected with (Family Connect) or granted co-parent access to — only the specific data covered by that connection, and only after you set it up.',
    ],
  },
  {
    heading: 'Children\'s Profiles',
    body: [
      'A parent or guardian account can create profiles for children in the family. Child profiles are managed entirely by the parent/guardian who created them — children do not create their own accounts or provide information directly to us. Location tracking for a child\'s device (Guardian feature) only becomes active after a parent explicitly pairs that device, and can be turned off at any time from the Guardian Dashboard.',
    ],
  },
  {
    heading: 'Family Connect and Co-Parent Sharing',
    body: [
      'Family Connect lets you link your household with another household to share posts, updates, and select calendar information; Co-Parent Access lets a parent outside your household see a shared custody calendar. Both are entirely opt-in — connections are only created when you send or accept an invitation, and only the specific information covered by that connection is shared with the other household. You can review and revoke any connection or co-parent grant at any time from Settings.',
    ],
  },
  {
    heading: 'Your Choices and Controls',
    body: ['You stay in control of your family\'s data:'],
    bullets: [
      'Notification preferences can be turned on or off individually in Settings.',
      'Bank accounts can be disconnected at any time from Finance settings.',
      'Location features (geofencing, Guardian tracking) are opt-in and can be disabled at any time.',
      'Household connections and co-parent access can be reviewed and revoked at any time from Settings.',
      'You can reset all local data and start fresh from Settings → Developer → Reset Local Data.',
      'You can permanently delete your account at any time from Settings → Account → Delete Account, or by contacting us through Help & Support. If you\'re the only login on your family\'s account, this also deletes your family\'s server-side data, revokes your connected bank\'s access via Plaid, and deletes your uploaded photos. If other family members still have active logins, your own login and profile are deleted, but shared family data (calendar, finances, etc.) remains for the family members still using it.',
    ],
  },
  {
    heading: 'Security',
    body: [
      'We use industry-standard encryption for data in transit and at rest, and store sensitive local data using your device\'s secure storage APIs. No method of storage or transmission is 100% secure, but we work to protect your family\'s information at every layer of the app.',
    ],
  },
  {
    heading: 'Changes to This Policy',
    body: [
      'If we make material changes to this policy, we\'ll update the "Last updated" date above and, where required, notify you in the app.',
    ],
  },
  {
    heading: 'Contact Us',
    body: [
      'Questions about this policy or your data can be sent through Settings → Help & Support, and we\'ll respond through the same channel.',
    ],
  },
];

export function PrivacyPolicyScreen({ navigation }: any) {
  const { t } = useTranslation('settings');
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This policy explains what information Family Command Center collects, how it's used, and the choices you have. It covers exactly what the app does today — nothing more."
      sections={SECTIONS}
      navigation={navigation}
    />
  );
}
