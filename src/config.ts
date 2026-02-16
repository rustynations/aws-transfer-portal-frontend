// AWS Configuration
// Bootstraps from public settings endpoint, falls back to .env.local

import type { PublicSettings } from './utils/api';

export const config: {
  apiEndpoint: string;
  cognito: { userPoolId: string; userPoolClientId: string; region: string };
  transferEndpoint?: string;
} = {
  // API Gateway endpoint from CDK output
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod',
  
  // Cognito configuration from CDK outputs
  cognito: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'your-client-id',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  },
  
  // Transfer Family endpoint from CDK output (omitted when SFTP is disabled)
  transferEndpoint: import.meta.env.VITE_TRANSFER_ENDPOINT || 's-xxxxxxxxxxxx.server.transfer.us-east-1.amazonaws.com',
};

/** Cached public settings after bootstrap */
let publicSettings: PublicSettings | null = null;

/**
 * Bootstrap config from the public /settings endpoint.
 * Overwrites config values with server-side settings if available.
 * Falls back to .env.local values on failure.
 */
export async function bootstrapConfig(): Promise<void> {
  try {
    const response = await fetch(`${config.apiEndpoint}/settings`);
    if (!response.ok) throw new Error('Settings fetch failed');
    
    const settings: PublicSettings = await response.json();
    publicSettings = settings;

    // Override config with server values if present
    if (settings.apiEndpoint) config.apiEndpoint = settings.apiEndpoint;
    if (settings.userPoolId) config.cognito.userPoolId = settings.userPoolId;
    if (settings.userPoolClientId) config.cognito.userPoolClientId = settings.userPoolClientId;
    if (settings.region) config.cognito.region = settings.region;

    // Only set transferEndpoint when SFTP is enabled
    if (settings.sftpEnabled) {
      config.transferEndpoint = import.meta.env.VITE_TRANSFER_ENDPOINT || config.transferEndpoint;
    } else {
      delete config.transferEndpoint;
    }
  } catch (err) {
    console.warn('Failed to bootstrap from /settings, using .env.local values:', err);
  }
}

/** Get cached public settings (available after bootstrapConfig) */
export function getPublicSettings(): PublicSettings | null {
  return publicSettings;
}

/** Check whether SFTP is enabled (available after bootstrapConfig) */
export function isSftpEnabled(): boolean {
  return publicSettings?.sftpEnabled ?? true;
}
