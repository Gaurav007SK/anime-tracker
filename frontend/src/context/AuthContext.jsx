import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI, setAuthToken } from '../api/animeAPI';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'anime_tracker_auth';

const readPersistedAuth = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (!parsed?.token || !parsed?.user) {
      return { token: null, user: null };
    }
    return { token: parsed.token, user: parsed.user };
  } catch {
    return { token: null, user: null };
  }
};

const persistAuth = (token, user) => {
  if (!token || !user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token,
      user
    })
  );
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => readPersistedAuth());
  const [loading, setLoading] = useState(true);

  const applyAuth = (token, user) => {
    setAuthToken(token);
    persistAuth(token, user);
    setAuthState({ token, user });
  };

  const clearAuth = () => {
    setAuthToken(null);
    persistAuth(null, null);
    setAuthState({ token: null, user: null });
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!authState.token) {
        setLoading(false);
        return;
      }

      try {
        setAuthToken(authState.token);
        const response = await authAPI.getMe();
        const user = response.data?.data?.user;

        if (!user) {
          clearAuth();
          setLoading(false);
          return;
        }

        applyAuth(authState.token, user);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const signup = async (payload) => {
    const response = await authAPI.signup(payload);
    const token = response.data?.data?.token;
    const user = response.data?.data?.user;

    if (!token || !user) {
      throw new Error('Invalid signup response from server');
    }

    applyAuth(token, user);
    return user;
  };

  const login = async (payload) => {
    const response = await authAPI.login(payload);
    const token = response.data?.data?.token;
    const user = response.data?.data?.user;

    if (!token || !user) {
      throw new Error('Invalid login response from server');
    }

    applyAuth(token, user);
    return user;
  };

  const logout = () => {
    clearAuth();
  };

  const fetchRecoveryQuestion = async (username) => {
    const response = await authAPI.getRecoveryQuestion(username);
    return response.data?.data;
  };

  const resetPassword = async (payload) => {
    const response = await authAPI.resetPassword(payload);
    return response.data;
  };

  const value = useMemo(
    () => ({
      user: authState.user,
      token: authState.token,
      loading,
      isAuthenticated: Boolean(authState.token && authState.user),
      signup,
      login,
      logout,
      fetchRecoveryQuestion,
      resetPassword
    }),
    [authState, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};