import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoisted mocks (vi.mock is hoisted, so mock fns must be too) ---
const {
  mockGetSession,
  mockAssociateSoftwareToken,
  mockVerifySoftwareToken,
  mockSetUserMfaPreference,
  mockGetUserData,
  mockSendMFACode,
  mockAuthenticateUser,
  mockSignOut,
  mockGetCurrentUser,
  mockCognitoUser,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAssociateSoftwareToken = vi.fn();
  const mockVerifySoftwareToken = vi.fn();
  const mockSetUserMfaPreference = vi.fn();
  const mockGetUserData = vi.fn();
  const mockSendMFACode = vi.fn();
  const mockAuthenticateUser = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetCurrentUser = vi.fn();

  const mockCognitoUser = {
    getSession: mockGetSession,
    associateSoftwareToken: mockAssociateSoftwareToken,
    verifySoftwareToken: mockVerifySoftwareToken,
    setUserMfaPreference: mockSetUserMfaPreference,
    getUserData: mockGetUserData,
    sendMFACode: mockSendMFACode,
    authenticateUser: mockAuthenticateUser,
    signOut: mockSignOut,
  };

  return {
    mockGetSession,
    mockAssociateSoftwareToken,
    mockVerifySoftwareToken,
    mockSetUserMfaPreference,
    mockGetUserData,
    mockSendMFACode,
    mockAuthenticateUser,
    mockSignOut,
    mockGetCurrentUser,
    mockCognitoUser,
  };
});

vi.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: vi.fn().mockImplementation(() => ({
    getCurrentUser: mockGetCurrentUser,
  })),
  CognitoUser: vi.fn().mockImplementation(() => mockCognitoUser),
  AuthenticationDetails: vi.fn().mockImplementation((data: Record<string, string>) => data),
}));

vi.mock('../config', () => ({
  config: {
    cognito: {
      userPoolId: 'us-east-1_TEST',
      userPoolClientId: 'test-client-id',
    },
  },
}));

import {
  associateSoftwareToken,
  verifySoftwareToken,
  setPreferredMFA,
  login,
  confirmMFACode,
} from './auth';

function setupValidSession() {
  mockGetCurrentUser.mockReturnValue(mockCognitoUser);
  mockGetSession.mockImplementation((cb: Function) => {
    cb(null, { isValid: () => true });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('associateSoftwareToken', () => {
  it('calls cognitoUser.associateSoftwareToken and resolves with secret code', async () => {
    setupValidSession();
    mockAssociateSoftwareToken.mockImplementation(
      (callbacks: { associateSecretCode: Function }) => {
        callbacks.associateSecretCode('JBSWY3DPEHPK3PXP');
      }
    );

    const secret = await associateSoftwareToken();

    expect(mockAssociateSoftwareToken).toHaveBeenCalledOnce();
    expect(secret).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects when associateSoftwareToken fails', async () => {
    setupValidSession();
    mockAssociateSoftwareToken.mockImplementation((callbacks: { onFailure: Function }) => {
      callbacks.onFailure(new Error('Token association failed'));
    });

    await expect(associateSoftwareToken()).rejects.toThrow('Token association failed');
  });

  it('rejects when no current user', async () => {
    mockGetCurrentUser.mockReturnValue(null);
    await expect(associateSoftwareToken()).rejects.toThrow('No authenticated user');
  });
});

describe('verifySoftwareToken', () => {
  it('calls cognitoUser.verifySoftwareToken with the code and device name', async () => {
    setupValidSession();
    mockVerifySoftwareToken.mockImplementation(
      (_code: string, _name: string, callbacks: { onSuccess: Function }) => {
        callbacks.onSuccess();
      }
    );

    await verifySoftwareToken('123456');

    expect(mockVerifySoftwareToken).toHaveBeenCalledWith(
      '123456',
      'TOTP Device',
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onFailure: expect.any(Function),
      })
    );
  });

  it('rejects when verification fails', async () => {
    setupValidSession();
    mockVerifySoftwareToken.mockImplementation(
      (_code: string, _name: string, callbacks: { onFailure: Function }) => {
        callbacks.onFailure(new Error('Invalid code'));
      }
    );

    await expect(verifySoftwareToken('000000')).rejects.toThrow('Invalid code');
  });

  it('rejects when no current user', async () => {
    mockGetCurrentUser.mockReturnValue(null);
    await expect(verifySoftwareToken('123456')).rejects.toThrow('No authenticated user');
  });
});

describe('setPreferredMFA', () => {
  it('calls setUserMfaPreference with TOTP enabled when method is TOTP', async () => {
    setupValidSession();
    mockSetUserMfaPreference.mockImplementation(
      (_sms: null, _token: object, cb: Function) => cb(null)
    );

    await setPreferredMFA('TOTP');

    expect(mockSetUserMfaPreference).toHaveBeenCalledWith(
      null,
      { PreferredMfa: true, Enabled: true },
      expect.any(Function)
    );
  });

  it('calls setUserMfaPreference with TOTP disabled when method is NOMFA', async () => {
    setupValidSession();
    mockSetUserMfaPreference.mockImplementation(
      (_sms: null, _token: object, cb: Function) => cb(null)
    );

    await setPreferredMFA('NOMFA');

    expect(mockSetUserMfaPreference).toHaveBeenCalledWith(
      null,
      { PreferredMfa: false, Enabled: false },
      expect.any(Function)
    );
  });

  it('rejects when setUserMfaPreference fails', async () => {
    setupValidSession();
    mockSetUserMfaPreference.mockImplementation(
      (_sms: null, _token: object, cb: Function) => cb(new Error('MFA preference failed'))
    );

    await expect(setPreferredMFA('TOTP')).rejects.toThrow('MFA preference failed');
  });
});

describe('login - MFA challenge', () => {
  it('returns MFAChallengeResult when Cognito sends SOFTWARE_TOKEN_MFA challenge', async () => {
    mockAuthenticateUser.mockImplementation(
      (_authDetails: object, callbacks: { totpRequired: Function }) => {
        callbacks.totpRequired();
      }
    );

    const result = await login('user@example.com', 'password123');

    expect(result).toEqual({
      challengeName: 'SOFTWARE_TOKEN_MFA',
      cognitoUser: mockCognitoUser,
    });
  });

  it('returns session on successful login without MFA', async () => {
    const mockSession = { isValid: () => true, getIdToken: vi.fn() };
    mockAuthenticateUser.mockImplementation(
      (_authDetails: object, callbacks: { onSuccess: Function }) => {
        callbacks.onSuccess(mockSession);
      }
    );

    const result = await login('user@example.com', 'password123');
    expect(result).toBe(mockSession);
  });
});

describe('confirmMFACode', () => {
  it('calls sendMFACode with code and SOFTWARE_TOKEN_MFA type', async () => {
    const mockSession = { isValid: () => true };
    mockSendMFACode.mockImplementation(
      (_code: string, callbacks: { onSuccess: Function }, _type: string) => {
        callbacks.onSuccess(mockSession);
      }
    );

    const result = await confirmMFACode(mockCognitoUser as any, '654321');

    expect(mockSendMFACode).toHaveBeenCalledWith(
      '654321',
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onFailure: expect.any(Function),
      }),
      'SOFTWARE_TOKEN_MFA'
    );
    expect(result).toBe(mockSession);
  });

  it('rejects when MFA code is invalid', async () => {
    mockSendMFACode.mockImplementation(
      (_code: string, callbacks: { onFailure: Function }, _type: string) => {
        callbacks.onFailure(new Error('Invalid MFA code'));
      }
    );

    await expect(confirmMFACode(mockCognitoUser as any, '000000')).rejects.toThrow(
      'Invalid MFA code'
    );
  });
});
