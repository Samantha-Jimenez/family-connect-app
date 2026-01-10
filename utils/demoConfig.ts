/**
 * Demo Configuration
 * 
 * This file contains configuration for the demo family feature.
 * Demo users can only see demo data, while real users see real family data.
 */

// Demo user IDs - Loaded from environment variables
// Set NEXT_PUBLIC_DEMO_USER_IDS as a comma-separated string of Cognito user IDs
// Example: NEXT_PUBLIC_DEMO_USER_IDS=user-id-1,user-id-2,user-id-3
// You can find these in AWS Cognito console after creating demo users
const demoUserIdsEnv = process.env.NEXT_PUBLIC_DEMO_USER_IDS || '';
export const DEMO_USER_IDS: string[] = demoUserIdsEnv
  ? demoUserIdsEnv.split(',').map(id => id.trim()).filter(id => id.length > 0)
  : ['919b6520-f0f1-70d7-ac6b-854d7b533b88']; // Default fallback for backward compatibility

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
 * These are loaded from environment variables for security
 */
export const DEMO_CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_DEMO_USERNAME || 'DemoUser',
  password: process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'Dem0User!',
  note: 'Use these credentials to access the demo version of the site with sample data.',
};

