const awsconfig = {
    aws_project_region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION || 'us-east-2',
    aws_cognito_region: process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || 'us-east-2',
    aws_user_pools_id: process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID,
    aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID,
};

export default awsconfig;
