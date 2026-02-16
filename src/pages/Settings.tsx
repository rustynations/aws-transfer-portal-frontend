import { useState, useEffect, useMemo } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import Button from '@cloudscape-design/components/button';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import TagEditor from '@cloudscape-design/components/tag-editor';
import Spinner from '@cloudscape-design/components/spinner';
import FileUpload from '@cloudscape-design/components/file-upload';
import { getAdminSettings, updateSettings, type AppSettings } from '../utils/api';
import { config, isSftpEnabled } from '../config';

function parseBytes(value: string, unit: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0) return 0;
  const multipliers: Record<string, number> = { 'Bytes': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824 };
  return num * (multipliers[unit] || 1);
}

function splitBytes(bytes: number): { value: string; unit: string } {
  if (bytes === 0) return { value: '0', unit: 'MB' };
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return { value: String(Math.round(bytes / Math.pow(k, i))), unit: sizes[i] };
}

export default function SettingsPage() {
  const sftpEnabled = isSftpEnabled();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Editable form state
  const [appName, setAppName] = useState('');
  const [loginDescription, setLoginDescription] = useState('');
  const [acceptedFileTypes, setAcceptedFileTypes] = useState<Array<{ key: string; value: string; existing: boolean }>>([]);
  const [maxFileSize, setMaxFileSize] = useState({ value: '100', unit: 'MB' });
  const [maxStoragePerUser, setMaxStoragePerUser] = useState({ value: '1', unit: 'GB' });
  const [maxFilesPerUser, setMaxFilesPerUser] = useState('1000');
  const [defaultAccessType, setDefaultAccessType] = useState('WEB_ONLY');

  // Logo/favicon upload state
  const [logoFile, setLogoFile] = useState<File[]>([]);
  const [faviconFile, setFaviconFile] = useState<File[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const hasChanges = useMemo(() => {
    if (!settings) return false;
    if (appName !== (settings.appName || '')) return true;
    if (loginDescription !== (settings.loginDescription || '')) return true;
    if (defaultAccessType !== (settings.defaultAccessType || 'WEB_ONLY')) return true;
    if ((parseInt(maxFilesPerUser, 10) || 1000) !== (settings.maxFilesPerUser || 1000)) return true;
    if (parseBytes(maxFileSize.value, maxFileSize.unit) !== (settings.maxFileSize || 104857600)) return true;
    if (parseBytes(maxStoragePerUser.value, maxStoragePerUser.unit) !== (settings.maxStoragePerUser || 1073741824)) return true;
    const currentTypes = acceptedFileTypes.filter(t => t.key && t.key.trim()).map(t => t.key.trim());
    if (JSON.stringify(currentTypes) !== JSON.stringify(settings.acceptedFileTypes || [])) return true;
    return false;
  }, [settings, appName, loginDescription, defaultAccessType, maxFilesPerUser, maxFileSize, maxStoragePerUser, acceptedFileTypes]);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await getAdminSettings();
      setSettings(data);

      // Populate form state
      setAppName(data.appName || '');
      setLoginDescription(data.loginDescription || '');
      setDefaultAccessType(data.defaultAccessType || 'WEB_ONLY');
      setMaxFilesPerUser(String(data.maxFilesPerUser || 1000));

      const fileSizeSplit = splitBytes(data.maxFileSize || 104857600);
      setMaxFileSize(fileSizeSplit);

      const storageSplit = splitBytes(data.maxStoragePerUser || 1073741824);
      setMaxStoragePerUser(storageSplit);

      // Convert acceptedFileTypes array to tag editor format
      if (data.acceptedFileTypes && data.acceptedFileTypes.length > 0) {
        setAcceptedFileTypes(
          data.acceptedFileTypes.map(ext => ({ key: ext, value: '', existing: true }))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Only send fields that actually changed
      const updates: Record<string, any> = {};

      if (appName !== (settings?.appName || '')) updates.appName = appName;
      if (loginDescription !== (settings?.loginDescription || '')) updates.loginDescription = loginDescription;
      if (defaultAccessType !== (settings?.defaultAccessType || 'WEB_ONLY')) updates.defaultAccessType = defaultAccessType;

      const newMaxFilesPerUser = parseInt(maxFilesPerUser, 10) || 1000;
      if (newMaxFilesPerUser !== (settings?.maxFilesPerUser || 1000)) updates.maxFilesPerUser = newMaxFilesPerUser;

      const newMaxFileSize = parseBytes(maxFileSize.value, maxFileSize.unit);
      if (newMaxFileSize !== (settings?.maxFileSize || 104857600)) updates.maxFileSize = newMaxFileSize;

      const newMaxStoragePerUser = parseBytes(maxStoragePerUser.value, maxStoragePerUser.unit);
      if (newMaxStoragePerUser !== (settings?.maxStoragePerUser || 1073741824)) updates.maxStoragePerUser = newMaxStoragePerUser;

      const newAcceptedFileTypes = acceptedFileTypes.filter(t => t.key && t.key.trim()).map(t => t.key.trim());
      const oldAcceptedFileTypes = settings?.acceptedFileTypes || [];
      if (JSON.stringify(newAcceptedFileTypes) !== JSON.stringify(oldAcceptedFileTypes)) updates.acceptedFileTypes = newAcceptedFileTypes;

      if (Object.keys(updates).length === 0) {
        setSuccess('No changes to save.');
        setSaving(false);
        return;
      }

      await updateSettings(updates as Partial<AppSettings>);
      setSuccess('Settings saved successfully.');

      // Reload to sync state
      await loadSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadAsset(file: File, type: 'logo' | 'favicon') {
    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);
    setError('');

    try {
      const filename = `${type}-${Date.now()}-${file.name}`;
      const { getIdToken } = await import('../utils/auth');
      const idToken = await getIdToken();

      // Get a pre-signed upload URL from the admin settings endpoint
      const response = await fetch(`${config.apiEndpoint}/admin/settings/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken,
        },
        body: JSON.stringify({ filename, contentType: file.type }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, key } = await response.json();

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      // Update the settings with the new key
      const settingKey = type === 'logo' ? 'logoKey' : 'faviconKey';
      await updateSettings({ [settingKey]: key } as Partial<AppSettings>);
      setSuccess(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);

      // Clear file input and reload
      if (type === 'logo') setLogoFile([]);
      else setFaviconFile([]);
      await loadSettings();
    } catch (err: any) {
      setError(err.message || `Failed to upload ${type}`);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <ContentLayout header={<Header variant="h1">Settings</Header>}>
        <Box textAlign="center" padding={{ vertical: 'xxxl' }}>
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Configure application settings and limits"
          actions={
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!hasChanges}>
              Save changes
            </Button>
          }
        >
          Settings
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error ? (
          <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>
        ) : null}
        {success ? (
          <Alert type="success" dismissible onDismiss={() => setSuccess('')}>{success}</Alert>
        ) : null}

        {/* Branding Section */}
        <Container header={<Header variant="h2">Branding</Header>}>
          <SpaceBetween size="m">
            <FormField label="Application Name" description="Displayed in the navigation bar and login page">
              <Input
                value={appName}
                onChange={({ detail }) => setAppName(detail.value)}
                placeholder="AWS Transfer Portal"
              />
            </FormField>

            <FormField label="Login Description" description="Footer text shown on all login screens">
              <Input
                value={loginDescription}
                onChange={({ detail }) => setLoginDescription(detail.value)}
                placeholder="Secure file transfer powered by AWS Transfer Family"
              />
            </FormField>

            <ColumnLayout columns={2}>
              <FormField label="Logo" description="Upload a logo image for the navigation bar">
                <SpaceBetween size="xs">
                  {settings?.logoUrl ? (
                    <Box>
                      <img src={settings.logoUrl} alt="Current logo" style={{ maxHeight: '40px', maxWidth: '200px' }} />
                    </Box>
                  ) : null}
                  <FileUpload
                    value={logoFile}
                    onChange={({ detail }) => setLogoFile(detail.value)}
                    accept="image/png,image/jpeg,image/svg+xml"
                    constraintText="PNG, JPG, or SVG. Max 1MB."
                    i18nStrings={{
                      uploadButtonText: () => 'Choose logo',
                      dropzoneText: () => 'Drop logo here',
                      removeFileAriaLabel: () => 'Remove file',
                      limitShowFewer: 'Show fewer',
                      limitShowMore: 'Show more',
                      errorIconAriaLabel: 'Error',
                    }}
                  />
                  {logoFile.length > 0 ? (
                    <Button
                      onClick={() => handleUploadAsset(logoFile[0], 'logo')}
                      loading={uploadingLogo}
                    >
                      Upload logo
                    </Button>
                  ) : null}
                </SpaceBetween>
              </FormField>

              <FormField label="Favicon" description="Upload a favicon for the browser tab">
                <SpaceBetween size="xs">
                  {settings?.faviconUrl ? (
                    <Box>
                      <img src={settings.faviconUrl} alt="Current favicon" style={{ maxHeight: '32px', maxWidth: '32px' }} />
                    </Box>
                  ) : null}
                  <FileUpload
                    value={faviconFile}
                    onChange={({ detail }) => setFaviconFile(detail.value)}
                    accept="image/png,image/x-icon,image/svg+xml"
                    constraintText="PNG, ICO, or SVG. Max 256KB."
                    i18nStrings={{
                      uploadButtonText: () => 'Choose favicon',
                      dropzoneText: () => 'Drop favicon here',
                      removeFileAriaLabel: () => 'Remove file',
                      limitShowFewer: 'Show fewer',
                      limitShowMore: 'Show more',
                      errorIconAriaLabel: 'Error',
                    }}
                  />
                  {faviconFile.length > 0 ? (
                    <Button
                      onClick={() => handleUploadAsset(faviconFile[0], 'favicon')}
                      loading={uploadingFavicon}
                    >
                      Upload favicon
                    </Button>
                  ) : null}
                </SpaceBetween>
              </FormField>
            </ColumnLayout>
          </SpaceBetween>
        </Container>

        {/* Limits Section */}
        <Container header={<Header variant="h2">Limits &amp; Defaults</Header>}>
          <SpaceBetween size="m">
            <FormField label="Default Access Type" description="Default access type when creating new users">
              <Select
                selectedOption={{ label: defaultAccessType, value: defaultAccessType }}
                onChange={({ detail }) => setDefaultAccessType(detail.selectedOption.value || 'WEB_ONLY')}
                options={sftpEnabled
                  ? [
                      { label: 'WEB_ONLY', value: 'WEB_ONLY', description: 'Web portal access only' },
                      { label: 'SFTP_ONLY', value: 'SFTP_ONLY', description: 'SFTP access only' },
                      { label: 'HYBRID', value: 'HYBRID', description: 'Both web and SFTP access' },
                    ]
                  : [
                      { label: 'WEB_ONLY', value: 'WEB_ONLY', description: 'Web portal access only' },
                    ]
                }
              />
            </FormField>

            <ColumnLayout columns={3}>
              <FormField label="Max File Size" description="Per-upload limit (web portal only)">
                <SpaceBetween direction="horizontal" size="xs">
                  <Input
                    value={maxFileSize.value}
                    onChange={({ detail }) => setMaxFileSize({ ...maxFileSize, value: detail.value })}
                    type="number"
                    inputMode="numeric"
                  />
                  <Select
                    selectedOption={{ label: maxFileSize.unit, value: maxFileSize.unit }}
                    onChange={({ detail }) => setMaxFileSize({ ...maxFileSize, unit: detail.selectedOption.value || 'MB' })}
                    options={[
                      { label: 'KB', value: 'KB' },
                      { label: 'MB', value: 'MB' },
                      { label: 'GB', value: 'GB' },
                    ]}
                  />
                </SpaceBetween>
              </FormField>

              <FormField label="Max Storage Per User" description="Storage quota per user">
                <SpaceBetween direction="horizontal" size="xs">
                  <Input
                    value={maxStoragePerUser.value}
                    onChange={({ detail }) => setMaxStoragePerUser({ ...maxStoragePerUser, value: detail.value })}
                    type="number"
                    inputMode="numeric"
                  />
                  <Select
                    selectedOption={{ label: maxStoragePerUser.unit, value: maxStoragePerUser.unit }}
                    onChange={({ detail }) => setMaxStoragePerUser({ ...maxStoragePerUser, unit: detail.selectedOption.value || 'GB' })}
                    options={[
                      { label: 'MB', value: 'MB' },
                      { label: 'GB', value: 'GB' },
                    ]}
                  />
                </SpaceBetween>
              </FormField>

              <FormField label="Max Files Per User" description="File count limit per user">
                <Input
                  value={maxFilesPerUser}
                  onChange={({ detail }) => setMaxFilesPerUser(detail.value)}
                  type="number"
                  inputMode="numeric"
                />
              </FormField>
            </ColumnLayout>

            <FormField
              label="Accepted File Types"
              description="File extensions allowed for web portal uploads. Does not apply to SFTP. Leave empty to allow all types."
            >
              <TagEditor
                tags={acceptedFileTypes}
                onChange={({ detail }) => setAcceptedFileTypes(detail.tags as any)}
                keysRequest={() => Promise.resolve([])}
                valuesRequest={() => Promise.resolve([])}
                i18nStrings={{
                  keyPlaceholder: 'e.g. .pdf',
                  valuePlaceholder: '',
                  addButton: 'Add file type',
                  removeButton: 'Remove',
                  undoButton: 'Undo',
                  undoPrompt: 'This file type will be removed',
                  loading: 'Loading',
                  keyHeader: 'Extension',
                  valueHeader: 'Description',
                  optional: 'optional',
                  keySuggestion: 'Custom extension',
                  valueSuggestion: 'Custom value',
                  emptyTags: 'No file type restrictions',
                  tooManyKeysSuggestion: 'Too many suggestions',
                  tooManyValuesSuggestion: 'Too many suggestions',
                  keysSuggestionLoading: 'Loading',
                  keysSuggestionError: 'Error',
                  valuesSuggestionLoading: 'Loading',
                  valuesSuggestionError: 'Error',
                  emptyKeyError: 'Extension required',
                  maxKeyCharLengthError: 'Too long',
                  maxValueCharLengthError: 'Too long',
                  duplicateKeyError: 'Duplicate extension',
                  tagLimit: (availableTags) => `You can add up to ${availableTags} more`,
                  tagLimitReached: (tagLimit) => `Maximum of ${tagLimit} types reached`,
                  tagLimitExceeded: (tagLimit) => `Maximum of ${tagLimit} types exceeded`,
                  enteredKeyLabel: (key) => `Use "${key}"`,
                  enteredValueLabel: (value) => `Use "${value}"`,
                }}
              />
            </FormField>
          </SpaceBetween>
        </Container>

        {/* Infrastructure (Read-Only) Section */}
        <Container header={<Header variant="h2" description="These values are set by CDK deployment and cannot be changed here">Infrastructure</Header>}>
          <ColumnLayout columns={2} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Project Name</Box>
              <Box>{settings?.projectName || '-'}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Region</Box>
              <Box>{settings?.region || '-'}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">API Endpoint</Box>
              <Box>{settings?.apiEndpoint || '-'}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Files Bucket</Box>
              <Box>{settings?.filesBucket || '-'}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">User Pool ID</Box>
              <Box>{settings?.userPoolId || '-'}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">User Pool Client ID</Box>
              <Box>{settings?.userPoolClientId || '-'}</Box>
            </div>
            {sftpEnabled && (
              <div>
                <Box variant="awsui-key-label">Transfer Server ID</Box>
                <Box>{settings?.transferServerId || '-'}</Box>
              </div>
            )}
            {sftpEnabled && (
              <div>
                <Box variant="awsui-key-label">Transfer Server Endpoint</Box>
                <Box>{settings?.transferServerEndpoint || '-'}</Box>
              </div>
            )}
          </ColumnLayout>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
