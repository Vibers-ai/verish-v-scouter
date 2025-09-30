// Maestro SSO Authentication Utilities

const TOKEN_KEY = 'maestro_token';
const USER_KEY = 'maestro_user';
const MAESTRO_URL_KEY = 'maestro_url';
const TOKEN_EXPIRY_KEY = 'maestro_token_expiry';

export const authUtils = {
  // Convert frontend URL to API URL
  getApiUrl(maestroUrl) {
    // Convert https://maestro.vibers-ai.dev to https://api-maestro.vibers-ai.dev
    return maestroUrl.replace('://maestro.', '://api-maestro.');
  },

  // Store authentication data
  saveAuthData(tokenData, maestroUrl) {
    const expiryTime = new Date().getTime() + (tokenData.expires_in * 1000);

    localStorage.setItem(TOKEN_KEY, tokenData.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(tokenData.user));
    localStorage.setItem(MAESTRO_URL_KEY, maestroUrl);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  },

  // Get stored token
  getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!token || !expiry) return null;

    // Check if token is expired
    if (new Date().getTime() > parseInt(expiry)) {
      this.clearAuthData();
      return null;
    }

    return token;
  },

  // Get stored user data
  getUser() {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user data:', e);
      return null;
    }
  },

  // Get Maestro URL
  getMaestroUrl() {
    return localStorage.getItem(MAESTRO_URL_KEY);
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Clear all auth data
  clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MAESTRO_URL_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  // Normalize user data from SSO (map company_name to company and lowercase)
  normalizeUserData(userData) {
    if (userData && userData.company_name && !userData.company) {
      userData.company = userData.company_name.toLowerCase();
    } else if (userData && userData.company) {
      userData.company = userData.company.toLowerCase();
    }
    return userData;
  },

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, maestroUrl, redirectUri) {
    try {
      const apiUrl = this.getApiUrl(maestroUrl);
      const response = await fetch(`${apiUrl}/api/v1/sso/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokenData = await response.json();
      tokenData.user = this.normalizeUserData(tokenData.user);
      return tokenData;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  },

  // Validate token with Maestro
  async validateToken(token, maestroUrl) {
    try {
      const apiUrl = this.getApiUrl(maestroUrl);
      const response = await fetch(`${apiUrl}/api/v1/sso/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  },

  // Get user info from Maestro
  async getUserInfo(token, maestroUrl) {
    try {
      const apiUrl = this.getApiUrl(maestroUrl);
      const response = await fetch(`${apiUrl}/api/v1/sso/userinfo`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userData = await response.json();
      return this.normalizeUserData(userData);
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  },

  // Check if token needs refresh (when less than 5 minutes remaining)
  needsRefresh() {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return true;

    const expiryTime = parseInt(expiry);
    const now = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000;

    return (expiryTime - now) < fiveMinutes;
  }
};