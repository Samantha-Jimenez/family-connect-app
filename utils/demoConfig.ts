/**
 * Demo Configuration
 * 
 * This file contains configuration for the demo family feature.
 * Demo users can only see demo data, while real users see real family data.
 */

// Demo user IDs - Add your demo user Cognito user IDs here
// You can find these in AWS Cognito console after creating demo users
export const DEMO_USER_IDS: string[] = [
  // Add demo user IDs here, e.g.:
  // 'demo-user-id-1',
  // 'demo-user-id-2',
  '919b6520-f0f1-70d7-ac6b-854d7b533b88',
];

// Demo family group identifier
export const DEMO_FAMILY_GROUP = 'demo';
export const REAL_FAMILY_GROUP = 'real'; // Default for existing real family data

/**
 * Check if a user is a demo user
 */
export function isDemoUser(userId: string | undefined | null): boolean {
  if (!userId) return false;
  return DEMO_USER_IDS.includes(userId);
}

/**
 * Get the family group for a user
 * Demo users see demo data, real users see real data
 */
export function getUserFamilyGroup(userId: string | undefined | null): string {
  if (isDemoUser(userId)) {
    return DEMO_FAMILY_GROUP;
  }
  return REAL_FAMILY_GROUP;
}

/**
 * Demo login credentials (for display purposes only)
 * Actual authentication is handled by AWS Cognito
 */
export const DEMO_CREDENTIALS = {
  username: 'DemoUser',
  password: 'Dem0User!', // Change this to your actual demo password
  note: 'Use these credentials to access the demo version of the site with sample data.',
};

