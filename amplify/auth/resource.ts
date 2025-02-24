import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
  // Customize verification mechanisms
  verification: {
    email: {
      emailSubject: 'Welcome to Family Connect!',
      emailBody: 'Your verification code is {####}',
    },
  },
  // Multi-factor authentication configuration
  multiFactor: {
    mode: 'optional',
  },
});
