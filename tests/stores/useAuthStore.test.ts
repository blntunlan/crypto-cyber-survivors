import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../stores/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    if (useAuthStore && useAuthStore.getState) {
      useAuthStore.setState({
        user: null,
        session: null,
        loading: false,
        error: null,
        authStage: 'LOGIN',
      });
    }
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.authStage).toBe('LOGIN');
  });

  it('should set session and user', () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSession = { access_token: 'abc', user: mockUser };

    useAuthStore.getState().setSession(mockSession as any);

    expect(useAuthStore.getState().session).toEqual(mockSession);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('should set error', () => {
    useAuthStore.getState().setError('Something went wrong');
    expect(useAuthStore.getState().error).toBe('Something went wrong');
  });

  it('should set auth stage', () => {
    useAuthStore.getState().setStage('OTP_VERIFY');
    expect(useAuthStore.getState().authStage).toBe('OTP_VERIFY');
  });

  it('should logout and clear state', () => {
    useAuthStore.getState().setSession({ user: { id: '1' } } as any);
    useAuthStore.getState().setError('Error');

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBeNull();
    expect(useAuthStore.getState().authStage).toBe('LOGIN');
  });
});
