import common from './common';
import settings from './settings';
import dashboard from './dashboard';
import family from './family';
import finance from './finance';
import ops from './ops';
import ai from './ai';
import health from './health';
import auth from './auth';
import onboarding from './onboarding';

export { common, settings, dashboard, family, finance, ops, ai, health, auth, onboarding };

// Default export for backward compatibility (e.g. _core still imported somewhere)
export default {
  ...common,
  ...settings,
  ...dashboard,
  ...family,
  ...finance,
  ...ops,
  ...ai,
  ...health,
  ...auth,
  ...onboarding,
};
