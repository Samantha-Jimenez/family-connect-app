import { defineAuth, secret } from '@aws-amplify/backend';

export const authConfig = defineAuth({
  loginWith: {
    email: true,
  }
}); 