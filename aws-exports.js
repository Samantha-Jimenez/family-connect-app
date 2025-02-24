const awsconfig = {
    aws_project_region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION || 'us-east-2',
    aws_cognito_region: process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || 'us-east-2',
    aws_user_pools_id: process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID,
    aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID,
    Auth: {
        // We should specify the auth mechanism we want to use
        Cognito: {
            // Mandatory Amazon Cognito User Pool ID
            userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID,
            // Optional Amazon Cognito Web Client ID (26-char alphanumeric string)
            userPoolWebClientId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID,
            // Hosted UI configuration
            oauth: {
                domain: process.env.NEXT_PUBLIC_AWS_COGNITO_DOMAIN,
                scope: ['email', 'openid', 'profile'],
                redirectSignIn: process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGNIN || 'http://localhost:3000',
                redirectSignOut: process.env.NEXT_PUBLIC_AWS_REDIRECT_SIGNOUT || 'http://localhost:3000',
                responseType: 'code'
            }
        }
    }
};

export default awsconfig;
