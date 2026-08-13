// Set EXPO_PUBLIC_TURNSTILE_SITE_KEY (Cloudflare dashboard → Turnstile → add
// site) as an EAS environment variable — see eas.json and .env.example.
// Left unset: SignUpScreen's TurnstileWidget doesn't render and the
// register call simply omits turnstileToken, which the backend treats as
// satisfied while its own TURNSTILE_SECRET_KEY is also unset.
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
