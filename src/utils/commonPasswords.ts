// Client-side mirror of family-command-center-api/src/utils/commonPasswords.ts
// — only used for immediate sign-up-form feedback; the server-side copy is
// the one that actually gates account creation.
export const COMMON_PASSWORDS = new Set<string>([
  'password', 'password1', 'password12', 'password123', 'password1234',
  '12345678', '123456789', '1234567890', '123123123', '111111111',
  'qwerty123', 'qwertyuiop', 'qwerty1234', 'letmein123', 'welcome123',
  'admin1234', 'iloveyou1', 'iloveyou12', 'monkey123', 'dragon123',
  'football1', 'baseball1', 'sunshine1', 'princess1', 'superman1',
  'trustno1x', 'starwars1', 'whatever1', 'shadow123', 'master123',
  'freedom12', 'ninja1234', 'mustang12', '1q2w3e4r5t', 'abc123456',
  'abcd1234', 'a1b2c3d4e5', 'passw0rd1', 'passw0rd123', 'p@ssw0rd1',
  'p@ssword1', 'changeme1', 'changeit1', 'letmein12', 'welcome12',
  '123qweasd', 'qazwsx123', 'zxcvbnm12', 'asdfghjkl1', 'iloveu123',
  'summer2024', 'winter2024', 'spring2024', 'autumn2024', 'family1234',
  'football123', 'basketball1', 'chocolate1', 'butterfly1', 'sunflower1',
  'newpassword1', 'temppass123', 'guest12345', 'testpass123', 'demo123456',
  'default123', 'temppass1', 'firstlast1', 'nopassword', 'nopassword1',
  '00000000', '11111111', '22222222', '87654321', '01234567',
  'q1w2e3r4t5', 'z1x2c3v4b5', '1qazxsw2', 'qwe123456', 'asd123456',
  'iloveyou123', 'trustno123', 'letmein2024', 'password2024', 'welcome2024',
]);
