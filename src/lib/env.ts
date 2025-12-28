export function validateEnv() {
  const required = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'MONGODB_URI',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_ID',
    'GITHUB_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  console.log('All environment variables are set');
}
