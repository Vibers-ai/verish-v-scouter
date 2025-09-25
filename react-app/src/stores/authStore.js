import { create } from 'zustand';
import { authUtils } from '../utils/authUtils';
import { isDevelopment, MOCK_USERS } from '../config/mockUsers';

// Get initial dev user from localStorage or use first mock user
const getInitialDevUser = () => {
  if (isDevelopment()) {
    const savedDevUser = localStorage.getItem('dev_user');
    return savedDevUser ? JSON.parse(savedDevUser) : MOCK_USERS[0];
  }
  return null;
};

const useAuthStore = create((set, get) => ({
  // State
  user: isDevelopment() ? getInitialDevUser() : authUtils.getUser(),
  token: isDevelopment() ? 'dev-token' : authUtils.getToken(),
  maestroUrl: authUtils.getMaestroUrl(),
  isAuthenticated: isDevelopment() ? true : authUtils.isAuthenticated(),
  isLoading: false,
  error: null,

  // Actions
  setAuth: (tokenData, maestroUrl) => {
    authUtils.saveAuthData(tokenData, maestroUrl);
    set({
      user: tokenData.user,
      token: tokenData.access_token,
      maestroUrl: maestroUrl,
      isAuthenticated: true,
      error: null,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // Login via SSO callback
  loginWithCode: async (code, maestroUrl) => {
    const { setAuth, setLoading, setError } = get();
    setLoading(true);
    setError(null);

    try {
      // Use the production URL for CloudFront deployment
      const redirectUri = window.location.hostname === 'localhost'
        ? `${window.location.origin}/auth/callback`
        : `https://d23c9bppj0gkul.cloudfront.net/auth/callback`;
      const tokenData = await authUtils.exchangeCodeForToken(code, maestroUrl, redirectUri);

      setAuth(tokenData, maestroUrl);
      setLoading(false);
      return { success: true, user: tokenData.user };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  },

  // Validate current token
  validateToken: async () => {
    const { token, maestroUrl, logout } = get();

    if (!token || !maestroUrl) {
      return false;
    }

    const isValid = await authUtils.validateToken(token, maestroUrl);

    if (!isValid) {
      logout();
      return false;
    }

    return true;
  },

  // Refresh user info
  refreshUserInfo: async () => {
    const { token, maestroUrl, setError } = get();

    if (!token || !maestroUrl) {
      return null;
    }

    try {
      const userData = await authUtils.getUserInfo(token, maestroUrl);
      set({ user: userData });
      return userData;
    } catch (error) {
      setError(error.message);
      return null;
    }
  },

  // Check if token needs refresh
  checkTokenRefresh: () => {
    return authUtils.needsRefresh();
  },

  // Logout
  logout: () => {
    authUtils.clearAuthData();
    set({
      user: null,
      token: null,
      maestroUrl: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Initialize auth state from localStorage
  initializeAuth: () => {
    // In development, use saved dev user or default to first mock user
    if (isDevelopment()) {
      const savedDevUser = localStorage.getItem('dev_user');
      const devUser = savedDevUser ? JSON.parse(savedDevUser) : MOCK_USERS[0];
      set({
        user: devUser,
        token: 'dev-token',
        maestroUrl: null,
        isAuthenticated: true,
      });
      return true;
    }

    const token = authUtils.getToken();
    const user = authUtils.getUser();
    const maestroUrl = authUtils.getMaestroUrl();

    if (token && user) {
      set({
        user,
        token,
        maestroUrl,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  },

  // Development only: Set mock user
  setDevUser: (mockUser) => {
    if (isDevelopment()) {
      set({
        user: mockUser,
        isAuthenticated: true,
      });
    }
  },
}));

export default useAuthStore;