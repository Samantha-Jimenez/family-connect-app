require('dotenv').config();

export const cognitoAuthConfig = {
    authority: process.env.COGNITO_AUTHORITY,
    client_id: process.env.COGNITO_CLIENT_ID,
    redirect_uri: process.env.COGNITO_REDIRECT_URI,
    response_type: process.env.COGNITO_RESPONSE_TYPE,
    scope: process.env.COGNITO_SCOPE,
    signIn: {
      email: { required: process.env.COGNITO_SIGN_IN_EMAIL_REQUIRED === 'true' },
    },
};

export default cognitoAuthConfig;
