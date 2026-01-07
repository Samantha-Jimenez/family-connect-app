# Demo Family Setup Guide

This guide explains how to set up a demo family for showcasing your Family Connect app without exposing your real family's private information.

## Overview

The demo system works by:
1. **Family Groups**: All data (family members, photos, relationships, events) is tagged with a `family_group` field
2. **Demo Users**: Demo users are configured to only see data with `family_group = 'demo'`
3. **Real Users**: Real users only see data with `family_group = 'real'` (or no family_group for backward compatibility)

## Setup Steps

### 1. Create Demo User in AWS Cognito

1. Go to AWS Cognito Console
2. Find your User Pool
3. Create a new user with:
   - Username/Email: `demo@familyconnect.app` (or your preferred demo email)
   - Password: Choose a secure password
   - Make sure the user is confirmed

### 2. Get Demo User ID

1. After creating the user, note their User ID (UUID)
2. Open `/utils/demoConfig.ts`
3. Add the demo user ID to the `DEMO_USER_IDS` array:

```typescript
export const DEMO_USER_IDS: string[] = [
  'your-demo-user-id-here', // Add your demo user's Cognito User ID
];
```

### 3. Update Demo Credentials

In `/utils/demoConfig.ts`, update the `DEMO_CREDENTIALS` object with your actual demo login info:

```typescript
export const DEMO_CREDENTIALS = {
  username: 'demo@familyconnect.app', // Your demo email
  password: 'YourDemoPassword123!', // Your demo password
  note: 'Use these credentials to access the demo version...',
};
```

### 4. Create Demo Family Data

You'll need to create demo family members, photos, relationships, and events in your DynamoDB tables. All demo data should have `family_group = 'demo'` (or `family_group = { S: 'demo' }` in DynamoDB format).

#### Option A: Use Admin Panel (Recommended)
1. Log in as a demo user
2. Use the admin panel to create demo family members
3. When creating members, ensure they have `family_group: 'demo'`

#### Option B: Manual DynamoDB Entry
1. Go to AWS DynamoDB Console
2. Open the `Family` table
3. Create demo family members with:
   - `family_member_id`: A unique ID (can match the Cognito user ID for the demo user)
   - `family_group`: `{ S: 'demo' }`
   - Add other fields as needed (first_name, last_name, etc.)

### 5. Create Demo Relationships

1. In the `Relationships` table, create relationships between demo family members
2. Both `person_a_id` and `person_b_id` should be demo family member IDs
3. The relationships will automatically be filtered by family group

### 6. Create Demo Photos (Optional)

1. Upload photos as the demo user
2. Photos uploaded by demo users will automatically be associated with the demo family group
3. You may need to update the photo upload logic to set `family_group` on photos

### 7. Test the Demo

1. Navigate to `/demo-login`
2. Log in with demo credentials
3. Verify that:
   - Only demo family members are visible
   - Only demo photos are visible
   - Only demo relationships are visible
   - Calendar events are only for demo family members

## How It Works

### Data Filtering

- **Family Members**: `getAllFamilyMembers()` automatically filters by the current user's family group
- **Photos**: Photos API filters by checking if `uploaded_by` belongs to a family member in the user's family group
- **Relationships**: Relationships are filtered to only include those where both persons are in the user's family group
- **Calendar Events**: Events are generated from family members, so they're automatically filtered

### Backward Compatibility

- Existing data without a `family_group` field is treated as `'real'` family data
- Real users will see all data without `family_group` or with `family_group = 'real'`
- Demo users will only see data with `family_group = 'demo'`

## Security Notes

1. **Demo Credentials**: The demo credentials are visible in the code. Consider:
   - Using environment variables for sensitive demo credentials
   - Rotating demo passwords regularly
   - Using a separate AWS account for demo environment (recommended for production)

2. **Data Isolation**: Ensure that:
   - Demo users cannot access real family data
   - Real users cannot access demo data
   - All queries properly filter by family group

3. **Testing**: Always test with both demo and real accounts to ensure proper isolation

## Troubleshooting

### Demo user sees real family data
- Check that the demo user ID is correctly added to `DEMO_USER_IDS` in `demoConfig.ts`
- Verify that `getUserFamilyGroup()` returns `'demo'` for the demo user
- Check that demo family members have `family_group = 'demo'` in DynamoDB

### Real users see demo data
- Verify that real family members don't have `family_group = 'demo'`
- Check that `getUserFamilyGroup()` returns `'real'` for real users

### Photos not filtering correctly
- Ensure photos API is receiving the `userId` query parameter
- Check that `uploaded_by` field in photos matches a family member ID in the correct family group

## Next Steps

1. Create demo family members with realistic but fake data
2. Add demo photos, relationships, and events
3. Test thoroughly with both demo and real accounts
4. Share the demo login page URL with potential viewers
5. Consider adding a banner on demo pages indicating it's demo data

