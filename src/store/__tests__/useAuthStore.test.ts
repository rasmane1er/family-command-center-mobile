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
  it('hits POST /auth/register directly (no login-first probe) and forwards every signup field', async () => {
    mockFetchOnce(201, {
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
      phone: '555-1234',
      dateOfBirth: '01/01/1990',
      gender: 'female',
      occupation: 'Engineer',
      bio: 'Hello',
      familyMotto: 'Stick together',
      numberOfChildren: 2,
      streetAddress: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
      emergencyContactName: 'Bob',
      emergencyContactPhone: '555-9999',
    });

    expect(result.success).toBe(true);
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toMatch(/\/auth\/register$/);
    const registerBody = JSON.parse(calls[0][1].body);
    expect(registerBody.email).toBe('newuser@example.com');
    expect(registerBody.familyName).toBe('The Test Family');
    expect(registerBody.memberName).toBe('Parent One');
    expect(registerBody.phone).toBe('555-1234');
    expect(registerBody.gender).toBe('female');
    expect(registerBody.occupation).toBe('Engineer');
    expect(registerBody.familyMotto).toBe('Stick together');
    expect(registerBody.numberOfChildren).toBe(2);
    expect(registerBody.zipCode).toBe('62704');
    expect(registerBody.emergencyContactName).toBe('Bob');

    // isAuthenticated is intentionally NOT flipped by signUp() itself — the
    // caller (SignUpScreen) hydrates useFamilyStore first and sets it once
    // that completes, so the dashboard never renders against blank state.
    // See the comment on this in useAuthStore.ts's signUp().
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).not.toBeNull();
    expect(useAuthStore.getState().familyId).toBe('family-2');
  });

  it('surfaces a 409 as an "already exists" error instead of authenticating', async () => {
    mockFetchOnce(409, { error: 'Email already in use' });

    const result = await useAuthStore.getState().signUp({
      displayName: 'Parent One',
      firstName: 'Parent',
      lastName: 'One',
      email: 'dupe@example.com',
      password: 'newpassword123',
      familyName: 'The Test Family',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('rejects a password shorter than the minimum before ever hitting the network', async () => {
    const result = await useAuthStore.getState().signUp({
      displayName: 'Parent One',
      firstName: 'Parent',
      lastName: 'One',
      email: 'newuser@example.com',
      password: 'short1',
    });

    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a password with no digit before ever hitting the network', async () => {
    const result = await useAuthStore.getState().signUp({
      displayName: 'Parent One',
      firstName: 'Parent',
      lastName: 'One',
      email: 'newuser@example.com',
      password: 'nodigitsatall',
    });

    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
