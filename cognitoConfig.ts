import { Amplify } from 'aws-amplify';

const cognitoConfig = {
  aws_project_region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-2',
  aws_cognito_region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-2',
  aws_user_pools_id: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  oauth: {
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
    redirectSignOut: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
    responseType: 'code'
  }
};

Amplify.configure(cognitoConfig);

export default cognitoConfig;
