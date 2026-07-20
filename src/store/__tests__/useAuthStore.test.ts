import { useAuthStore } from '../useAuthStore';

// Smoke tests for the sign-in/sign-up network flow — these exist to catch
// the class of regression that's bitten this store before (e.g. the missing
// Authorization header bug fixed earlier this session): a request body/URL
// typo, a response field renamed on the API side, or a status-code branch
// silently stopping matching real backend responses.

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    familyId: null,
    backendUserId: null,
    pendingVerificationEmail: null,
  } as Partial<ReturnType<typeof useAuthStore.getState>>);
});

describe('useAuthStore.signIn', () => {
  it('hits POST /auth/login with the entered credentials and authenticates on success', async () => {
    mockFetchOnce(200, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', familyId: 'family-1' },
      emailVerified: true,
    });

    const result = await useAuthStore.getState().signIn('Test@Example.com', 'correct-password');

    expect(result.success).toBe(true);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/auth\/login$/);
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    // Email is normalized (lowercased/trimmed) before being sent.
    expect(body.email).toBe('test@example.com');
    expect(body.password).toBe('correct-password');

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().familyId).toBe('family-1');
  });

  it('surfaces the email_not_verified gate instead of a generic failure', async () => {
    mockFetchOnce(403, { error: 'email_not_verified' });

    const result = await useAuthStore.getState().signIn('unverified@example.com', 'password123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('email_not_verified');
    expect(useAuthStore.getState().pendingVerificationEmail).toBe('unverified@example.com');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('rejects with a clear error and does not authenticate on invalid credentials', async () => {
    mockFetchOnce(401, { message: 'Invalid email or password' });

    const result = await useAuthStore.getState().signIn('test@example.com', 'wrong-password');

    expect(result.success).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('fails gracefully (not a thrown exception) when the network is unreachable', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

    const result = await useAuthStore.getState().signIn('test@example.com', 'password123');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('useAuthStore.signUp', () => {
  it('falls back to POST /auth/register (after login 404s for a brand-new email) with the signup form fields', async () => {
    // signUp's backend sync tries login first (in case this device is
    // registering for an account that already exists server-side from
    // another device) and only registers on a non-5xx login failure — see
    // syncWithBackend in useAuthStore.ts.
    mockFetchOnce(404, { message: 'No account found' });
    mockFetchOnce(200, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-2', familyId: 'family-2' },
      emailVerified: true,
    });

    const result = await useAuthStore.getState().signUp({
      displayName: 'Parent One',
      firstName: 'Parent',
      lastName: 'One',
      email: 'newuser@example.com',
      password: 'newpassword123',
      familyName: 'The Test Family',
    });

    expect(result.success).toBe(true);
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toMatch(/\/auth\/login$/);
    expect(calls[1][0]).toMatch(/\/auth\/register$/);
    const registerBody = JSON.parse(calls[1][1].body);
    expect(registerBody.email).toBe('newuser@example.com');
    expect(registerBody.familyName).toBe('The Test Family');
    expect(registerBody.memberName).toBe('Parent One');

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().familyId).toBe('family-2');
  });

  it('rejects a password under 6 characters before ever hitting the network', async () => {
    const result = await useAuthStore.getState().signUp({
      displayName: 'Parent One',
      firstName: 'Parent',
      lastName: 'One',
      email: 'newuser@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
