import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/auth-store';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('initializes with null user and unauthenticated status', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('sets user, access token, and refresh token on setAuth', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@goflow.com',
      full_name: 'Test User',
      role: 'developer',
    };

    useAuthStore.getState().setAuth(mockUser, 'access-token-abc', 'refresh-token-xyz');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token-abc');
    expect(state.refreshToken).toBe('refresh-token-xyz');
    expect(state.isAuthenticated).toBe(true);
  });

  it('clears auth on clearAuth', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@goflow.com',
      full_name: 'Test User',
    };

    useAuthStore.getState().setAuth(mockUser, 'token-123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('updates user properties on updateUser', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@goflow.com',
      full_name: 'Test User',
      role: 'developer',
    };

    useAuthStore.getState().setAuth(mockUser, 'token-123');
    useAuthStore.getState().updateUser({ full_name: 'Updated Name', timezone: 'UTC' });

    const state = useAuthStore.getState();
    expect(state.user?.full_name).toBe('Updated Name');
    expect(state.user?.timezone).toBe('UTC');
    expect(state.user?.email).toBe('test@goflow.com');
    expect(state.accessToken).toBe('token-123');
  });
});
