import { config } from '../config';
import { getIdToken } from './auth';

export interface ApiError {
  message: string;
  statusCode?: number;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const idToken = await getIdToken();
  
  // console.log('API Request:', endpoint);
  
  const baseUrl = config.apiEndpoint.replace(/\/+$/, '');
  console.log('API Request:', `${baseUrl}${endpoint}`, options.method || 'GET', options.body || '');
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': idToken,
      ...options.headers,
    },
  });

  console.log('API Response status:', response.status, endpoint);

  if (!response.ok) {
    const error: ApiError = {
      message: `API request failed: ${response.statusText}`,
      statusCode: response.status,
    };
    
    try {
      const errorData = await response.json();
      console.error('API Error response:', errorData);
      error.message = errorData.message || errorData.error || error.message;
    } catch {
      // Use default error message
    }
    
    throw error;
  }

  const data = await response.json();
  // console.log('API Response data:', endpoint, data);
  return data;
}

// User Management API
export interface UserData {
  username: string;
  email: string;
  display_name?: string;
  access_type: 'ADMIN' | 'WEB_ONLY' | 'SFTP_ONLY' | 'HYBRID';
  ssh_keys?: string[];
  status?: 'active' | 'disabled';
  is_root?: boolean;
  created_at?: string;
  last_login?: string;
  file_count?: number;
  storage_bytes?: number;
}

export interface UsersResponse {
  users: UserData[];
  count: number;
}

export async function listUsers(): Promise<UserData[]> {
  const response = await apiRequest<UsersResponse>('/users');
  return response.users;
}

export async function getUser(username: string): Promise<UserData> {
  return apiRequest<UserData>(`/users/${username}`);
}

export async function createUser(user: Omit<UserData, 'username' | 'created_at' | 'last_login' | 'file_count' | 'storage_bytes'>): Promise<UserData> {
  return apiRequest<UserData>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function updateUser(username: string, updates: Partial<UserData>): Promise<UserData> {
  return apiRequest<UserData>(`/users/${username}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(username: string): Promise<void> {
  return apiRequest<void>(`/users/${username}`, {
    method: 'DELETE',
  });
}

export async function resetUserMFA(userId: string): Promise<void> {
  return apiRequest<void>(`/users/${userId}/reset-mfa`, {
    method: 'POST',
  });
}

// Profile API (self-service)
export async function getProfile(): Promise<UserData> {
  return apiRequest<UserData>('/users/profile');
}

export async function updateProfile(updates: { display_name: string }): Promise<{ message: string; display_name: string }> {
  return apiRequest<{ message: string; display_name: string }>('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// SSH Key Management API
export interface SSHKey {
  key_id: string;
  public_key?: string;  // Only returned when adding a key
  fingerprint?: string; // Returned when listing keys
  added_date: string;
}

export interface KeysResponse {
  keys: SSHKey[];
  count: number;
}

export async function listKeys(): Promise<SSHKey[]> {
  const response = await apiRequest<KeysResponse>('/keys');
  return response.keys;
}

export async function addKey(publicKey: string): Promise<SSHKey> {
  return apiRequest<SSHKey>('/keys', {
    method: 'POST',
    body: JSON.stringify({ public_key: publicKey }),
  });
}

export async function deleteKey(keyId: string): Promise<void> {
  return apiRequest<void>(`/keys/${keyId}`, {
    method: 'DELETE',
  });
}

// File Operations API
export type FolderType = 'private' | 'shared';

export interface FileMetadata {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  type: 'file';
}

export interface FolderMetadata {
  name: string;
  lastModified: string;
  type: 'folder';
}

export interface FilesResponse {
  files: FileMetadata[];
  folders: FolderMetadata[];
  count: number;
  totalSize: number;
}

export async function listFiles(
  folder: FolderType = 'private',
  path?: string
): Promise<FilesResponse> {
  const params = new URLSearchParams({ folder });
  if (path) {
    params.append('path', path);
  }
  const data = await apiRequest<FilesResponse>(`/files?${params.toString()}`);
  // Ensure type fields are set (backend may not include them)
  data.files = (data.files || []).map(f => ({ ...f, type: 'file' as const }));
  data.folders = (data.folders || []).map(f => ({ ...f, type: 'folder' as const }));
  return data;
}

export async function getUploadUrl(
  filename: string,
  folder: FolderType = 'private',
  path?: string
): Promise<{ uploadUrl: string; key: string }> {
  return apiRequest<{ uploadUrl: string; key: string }>('/files/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename, folder, path }),
  });
}

export async function getDownloadUrl(
  filename: string,
  folder: FolderType = 'private',
  path?: string
): Promise<{ downloadUrl: string }> {
  return apiRequest<{ downloadUrl: string }>('/files/download-url', {
    method: 'POST',
    body: JSON.stringify({ filename, folder, path }),
  });
}

export async function deleteFile(
  filename: string,
  folder: FolderType = 'private',
  path?: string
): Promise<void> {
  return apiRequest<void>('/files', {
    method: 'DELETE',
    body: JSON.stringify({ filename, folder, path }),
  });
}

export async function createFolder(
  folderName: string,
  folder: FolderType = 'private',
  path?: string
): Promise<void> {
  return apiRequest<void>('/files/folder', {
    method: 'POST',
    body: JSON.stringify({ folderName, folder, path }),
  });
}

export async function deleteFolder(
  folderName: string,
  folder: FolderType = 'private',
  path?: string
): Promise<void> {
  return apiRequest<void>('/files/folder', {
    method: 'DELETE',
    body: JSON.stringify({ folderName, folder, path }),
  });
}

// Admin Dashboard API
export interface SystemStats {
  totalUsers: number;
  usersByAccessType: Record<string, number>;
  totalFiles: number;
  totalStorageBytes: number;
}

export interface UserStats {
  username: string;
  fileCount: number;
  storageBytes: number;
}

export interface ActivityLogEntry {
  timestamp: string;
  username: string;
  email: string;
  action: string;
  protocol: string;
  filename?: string;
}

export async function getSystemStats(): Promise<SystemStats> {
  return apiRequest<SystemStats>('/admin/stats');
}

export async function getUserStats(username: string): Promise<UserStats> {
  return apiRequest<UserStats>(`/admin/stats/${username}`);
}

export async function getActivityLog(): Promise<ActivityLogEntry[]> {
  const response = await apiRequest<{ activities: ActivityLogEntry[]; count: number; timeRange: string }>('/admin/activity');
  return response.activities;
}

// Settings API
export interface PublicSettings {
  appName: string;
  loginDescription: string;
  logoUrl: string;
  faviconUrl: string;
  motd: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  apiEndpoint: string;
  sftpEnabled: boolean;
}

export interface AppSettings extends PublicSettings {
  settingKey: string;
  projectName: string;
  logoKey: string;
  faviconKey: string;
  acceptedFileTypes: string[];
  maxFileSize: number;
  maxStoragePerUser: number;
  maxFilesPerUser: number;
  defaultAccessType: string;
  transferServerEndpoint?: string;
  transferServerId?: string;
  filesBucket: string;
  _readOnlyFields: string[];
}

/**
 * Fetch public settings (no auth required).
 * Used to bootstrap the app before login.
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  const response = await fetch(`${config.apiEndpoint.replace(/\/+$/, '')}/settings`);
  if (!response.ok) {
    throw new Error('Failed to fetch public settings');
  }
  return response.json();
}

export async function getAdminSettings(): Promise<AppSettings> {
  return apiRequest<AppSettings>('/admin/settings');
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<{ message: string; updated: string[]; rejectedReadOnly?: string[] }> {
  return apiRequest<{ message: string; updated: string[]; rejectedReadOnly?: string[] }>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}


// API Key Management API
export interface ApiKeyMetadata {
  keyId: string;
  label: string;
  createdAt: number;
  expiresAt?: number;
  lastUsedAt?: number;
  status: 'active' | 'revoked';
}

export interface CreateApiKeyResponse {
  keyId: string;
  rawKey: string;
  label: string;
  createdAt: number;
  expiresAt?: number;
}

export interface ListApiKeysResponse {
  keys: ApiKeyMetadata[];
  count: number;
}

export async function listApiKeys(username?: string): Promise<ApiKeyMetadata[]> {
  const params = username ? `?username=${encodeURIComponent(username)}` : '';
  const response = await apiRequest<ListApiKeysResponse>(`/api-keys${params}`);
  return response.keys;
}

export async function createApiKey(options?: {
  username?: string;
  label?: string;
  expiresInDays?: number;
}): Promise<CreateApiKeyResponse> {
  return apiRequest<CreateApiKeyResponse>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

export async function revokeApiKey(keyId: string): Promise<void> {
  return apiRequest<void>(`/api-keys/${keyId}`, {
    method: 'DELETE',
  });
}
