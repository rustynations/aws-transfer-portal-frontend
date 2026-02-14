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
  
  console.log('API Request:', endpoint);
  
  const response = await fetch(`${config.apiEndpoint}${endpoint}`, {
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
      error.message = errorData.message || error.message;
    } catch {
      // Use default error message
    }
    
    throw error;
  }

  const data = await response.json();
  console.log('API Response data:', endpoint, data);
  return data;
}

// User Management API
export interface UserData {
  username: string;
  email: string;
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

export async function createUser(user: Omit<UserData, 'created_at' | 'last_login' | 'file_count' | 'storage_bytes'>): Promise<UserData> {
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
export interface FileMetadata {
  name: string;
  size: number;
  lastModified: string;
}

export interface FilesResponse {
  files: FileMetadata[];
  count: number;
  totalSize: number;
}

export async function listFiles(): Promise<FileMetadata[]> {
  const response = await apiRequest<FilesResponse>('/files');
  return response.files;
}

export async function getUploadUrl(filename: string): Promise<{ uploadUrl: string }> {
  return apiRequest<{ uploadUrl: string }>('/files/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
}

export async function getDownloadUrl(filename: string): Promise<{ downloadUrl: string }> {
  return apiRequest<{ downloadUrl: string }>('/files/download-url', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });
}

export async function deleteFile(filename: string): Promise<void> {
  return apiRequest<void>('/files', {
    method: 'DELETE',
    body: JSON.stringify({ filename }),
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
