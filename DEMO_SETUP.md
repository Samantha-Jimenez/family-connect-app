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

### 2. Set Demo User IDs and Credentials as Environment Variables

Set the following environment variables (preferably in `.env.local` for development and your hosting platform for production):

**Demo User IDs:**
```bash
NEXT_PUBLIC_DEMO_USER_IDS=your-demo-user-id-1,your-demo-user-id-2
```

- Get your demo user IDs (UUIDs) from AWS Cognito Console after creating demo users
- For multiple demo users, separate IDs with commas: `id1,id2,id3`
- If not set, defaults to a single hardcoded ID for backward compatibility

**Demo Credentials:**
```bash
NEXT_PUBLIC_DEMO_USERNAME=demo@familyconnect.app
NEXT_PUBLIC_DEMO_PASSWORD=YourDemoPassword123!
```

**Note:** The `NEXT_PUBLIC_` prefix is required for these variables to be accessible in client-side code where the login page displays them.

**Complete Example:**
```bash
# Demo User IDs (comma-separated)
NEXT_PUBLIC_DEMO_USER_IDS=919b6520-f0f1-70d7-ac6b-854d7b533b88

# Demo Credentials
NEXT_PUBLIC_DEMO_USERNAME=demo@familyconnect.app
NEXT_PUBLIC_DEMO_PASSWORD=YourDemoPassword123!
```

These credentials will be displayed on the login page for users who want to explore the demo.

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

### 6. Create Demo Photos

1. Log in as the demo user
2. Upload photos using the photo upload feature
3. Photos uploaded by demo users will **automatically** be associated with `family_group = 'demo'`
   - **Security Note:** The `family_group` is always determined from the authenticated user's group
   - Any provided `family_group` value is ignored for security (prevents client-side manipulation)
4. This ensures photos are properly filtered and only visible to demo users

### 7. Test the Demo

1. Log in with the demo credentials (displayed on the login page or from environment variables)
2. Verify that:
   - Only demo family members are visible
   - Only demo photos are visible (photos with `family_group = 'demo'`)
   - Only demo relationships are visible
   - Calendar events (birthdays, memorials) are only for demo family members
   - Events created by demo users are properly tagged with `family_group = 'demo'`

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
- Check that the demo user ID is correctly set in `NEXT_PUBLIC_DEMO_USER_IDS` environment variable
- Verify the environment variable is properly formatted (comma-separated IDs, no spaces unless trimmed)
- Verify that `getUserFamilyGroup()` returns `'demo'` for the demo user
- Check that demo family members have `family_group = 'demo'` in DynamoDB
- Ensure the environment variables are set in your hosting platform (not just `.env.local`)

### Real users see demo data
- Verify that real family members don't have `family_group = 'demo'`
- Check that `getUserFamilyGroup()` returns `'real'` for real users

### Photos not filtering correctly
- Ensure photos API is receiving the `userId` query parameter
- Check that `family_group` field on photos matches the user's family group (`'demo'` for demo users, `'real'` for real users)
- Verify that photos uploaded by demo users have `family_group = 'demo'` set in DynamoDB
- Check that `uploaded_by` field in photos matches a family member ID in the correct family group

## Next Steps

1. Set environment variables for demo user IDs and credentials (see step 2)
2. Create demo family members with realistic but fake data
3. Upload demo photos (they will automatically get `family_group = 'demo'` - see step 5)
4. Add demo relationships and events
5. Test thoroughly with both demo and real accounts to ensure proper isolation
6. Share the app URL with demo credentials with potential viewers
7. Consider adding a visual indicator (banner/badge) on demo pages showing "Demo Mode"

## Environment Variables Summary

For production, make sure to set these environment variables in your hosting platform:

```bash
# Demo User IDs (comma-separated Cognito User IDs)
NEXT_PUBLIC_DEMO_USER_IDS=your-demo-user-id-1,your-demo-user-id-2

# Demo Credentials (displayed on login page)
NEXT_PUBLIC_DEMO_USERNAME=your-demo-username
NEXT_PUBLIC_DEMO_PASSWORD=your-demo-password
```

**Notes:**
- All variables use `NEXT_PUBLIC_` prefix to be accessible in client-side code
- `NEXT_PUBLIC_DEMO_USER_IDS` is used to determine which users are demo users for filtering
- Demo credentials are displayed on the login page for easy access
- If `NEXT_PUBLIC_DEMO_USER_IDS` is not set, it defaults to a hardcoded value for backward compatibility

