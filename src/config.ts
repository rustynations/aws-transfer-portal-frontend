// AWS Configuration
// Update these values with your deployed infrastructure outputs

export const config = {
  // API Gateway endpoint from CDK output
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod',
  
  // Cognito configuration from CDK outputs
  cognito: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'your-client-id',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  },
  
  // Transfer Family endpoint from CDK output
  transferEndpoint: import.meta.env.VITE_TRANSFER_ENDPOINT || 's-xxxxxxxxxxxx.server.transfer.us-east-1.amazonaws.com',
};
