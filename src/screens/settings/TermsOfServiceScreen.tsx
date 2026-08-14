import React from 'react';
import { LegalDocumentLayout, LegalSection } from '../../components/common/LegalDocumentLayout';
import { useTranslation } from 'react-i18next';

const LAST_UPDATED = 'August 14, 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance of Terms',
    body: [
      'By creating an account or using Family Command Center, you agree to these Terms of Service and our Privacy Policy. If you\'re creating profiles for children in your family, you\'re confirming you\'re their parent or legal guardian and are responsible for their use of the app under your account.',
    ],
  },
  {
    heading: 'Accounts',
    body: [
      'You\'re responsible for keeping your account credentials secure and for all activity that happens under your account. Only one adult (parent/guardian) account is needed per family — you add other family members as profiles under it, not as separate logins, except where the app explicitly supports a linked child device.',
    ],
  },
  {
    heading: 'Subscriptions and Billing',
    body: [
      'Family Command Center offers a free tier and paid subscription tiers (Premium and Family Pro) with additional features, such as unlimited AI queries, bank account syncing, and Military Mode.',
    ],
    bullets: [
      'Subscriptions are purchased and billed through the Apple App Store or Google Play, not directly by us.',
      'Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period.',
      'You can manage or cancel your subscription anytime from your device\'s App Store or Google Play account settings.',
      'If a free trial is offered, you\'ll be charged automatically when it ends unless you cancel before then.',
      'Refunds are handled by Apple or Google according to their respective policies — we don\'t process payments or refunds directly.',
    ],
  },
  {
    heading: 'The AI Assistant',
    body: [
      'The AI Assistant is a convenience feature that uses your family\'s data (tasks, bills, budgets, etc.) to answer questions and make suggestions. It is not a licensed financial advisor, medical professional, therapist, or attorney, and its responses should not be treated as professional advice. Always use your own judgment, and consult a qualified professional for financial, medical, legal, or safety decisions.',
    ],
  },
  {
    heading: 'Guardian, SOS, and Safety Features',
    body: [
      'Guardian device pairing, location tracking, geofence alerts, and SOS alerts are tools to help families stay connected — they are not a substitute for emergency services, professional monitoring, or your own judgment about a child\'s safety. In an emergency, always contact local emergency services directly. We cannot guarantee that a notification, alert, or location update will be delivered instantly or at all — deliverability depends on device connectivity, battery, OS permissions, and other factors outside our control.',
    ],
  },
  {
    heading: 'Financial Features',
    body: [
      'Bank account linking is provided through Plaid. We display the balances and transactions Plaid returns to us, but we don\'t initiate transfers, payments, or any changes to your actual bank accounts through the app. Budgets, goals, and projections shown in the app are estimates based on the data you\'ve entered and should not be treated as guaranteed financial outcomes.',
    ],
  },
  {
    heading: 'Family Connect and Household Connections',
    body: [
      'Family Connect and Co-Parent Access let you share posts, updates, or a custody calendar with another household you choose to connect with. You\'re responsible for only connecting with people you trust and for what you choose to share with a connected household — once shared, that household\'s members can see it under their own account. We aren\'t responsible for how a connected household uses information you\'ve chosen to share with them. You can revoke a connection at any time, which stops future sharing but does not retroactively remove information already visible to that household.',
    ],
  },
  {
    heading: 'Your Content',
    body: [
      'You retain ownership of the content you add to the app — family data, photos, documents, journal entries, and so on. By using features like the AI Assistant or support chat, you\'re allowing us to process that content as needed to provide the feature (for example, sending relevant family context to our AI provider to generate a response).',
    ],
  },
  {
    heading: 'Acceptable Use',
    body: ['You agree not to:'],
    bullets: [
      'Use the app for any unlawful purpose, or to monitor or track a family member without their knowledge where that would be illegal in your jurisdiction (for example, tracking an adult\'s device without their consent).',
      'Attempt to reverse-engineer, disrupt, or gain unauthorized access to the app or its backend services.',
      'Upload content that infringes someone else\'s rights or that you don\'t have the right to share.',
      'Use Family Connect or Co-Parent Access to connect with, or share family data with, anyone outside your trusted circle of family and co-parents.',
    ],
  },
  {
    heading: 'Termination',
    body: [
      'You can stop using the app and permanently delete your account at any time from Settings → Account → Delete Account, or by contacting us through Help & Support. We may suspend or terminate accounts that violate these terms or that we believe are being used fraudulently or unlawfully.',
    ],
  },
  {
    heading: 'Disclaimers and Limitation of Liability',
    body: [
      'The app is provided "as is." We work hard to keep it reliable, but we don\'t guarantee it will always be available, error-free, or that any specific feature (notifications, AI responses, bank syncing, location updates) will work exactly as expected at all times. To the fullest extent permitted by law, we aren\'t liable for indirect or consequential damages arising from your use of the app.',
    ],
  },
  {
    heading: 'Changes to These Terms',
    body: [
      'We may update these terms from time to time. If we make material changes, we\'ll update the "Last updated" date above and, where required, notify you in the app. Continuing to use the app after changes take effect means you accept the updated terms.',
    ],
  },
  {
    heading: 'Contact Us',
    body: [
      'Questions about these terms can be sent through Settings → Help & Support, and we\'ll respond through the same channel.',
    ],
  },
];

export function TermsOfServiceScreen({ navigation }: any) {
  const { t } = useTranslation('settings');
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of Family Command Center. They describe what you can expect from the app and what we ask of you in return."
      sections={SECTIONS}
      navigation={navigation}
    />
  );
}
