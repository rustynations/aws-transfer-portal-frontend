import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { config } from '../config';

// Create Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: config.cognito.userPoolId,
  ClientId: config.cognito.userPoolClientId,
});

export interface User {
  username: string;
  email: string;
  accessType: string;
}

/**
 * Sign in with email and password
 */
export async function login(email: string, password: string): Promise<CognitoUserSession> {
  const authenticationDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        resolve(session);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Sign out current user
 */
export function logout(): void {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
}

/**
 * Get current authenticated user
 */
export async function getUser(): Promise<User | null> {
  const cognitoUser = userPool.getCurrentUser();
  
  if (!cognitoUser) {
    return null;
  }

  return new Promise((resolve) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      const idToken = session.getIdToken();
      const payload = idToken.payload;

      resolve({
        username: payload['cognito:username'] as string,
        email: payload.email as string,
        accessType: payload['custom:access_type'] as string || 'WEB_ONLY',
      });
    });
  });
}

/**
 * Get ID token for API requests
 */
export async function getIdToken(): Promise<string> {
  const cognitoUser = userPool.getCurrentUser();
  
  if (!cognitoUser) {
    throw new Error('No authenticated user');
  }

  return new Promise((resolve, reject) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        reject(err || new Error('No session'));
        return;
      }

      resolve(session.getIdToken().getJwtToken());
    });
  });
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  return user?.accessType === 'ADMIN';
}
