'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/user';
import { authService, LoginCredentials } from '@/services/auth.service';
import { mockStore } from '@/mocks';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isMockMode: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  switchUser: (user: User) => void;
  availableDemoUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const current = authService.getCurrentUser();
    setUser(current);
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const session = await authService.login(credentials);
    setUser(session.user);
    return session.user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const switchUser = (newUser: User) => {
    if (!authService.isMockMode) return;
    authService.setCurrentUser(newUser);
    setUser(newUser);
  };

  const isMockMode = authService.isMockMode;
  const availableDemoUsers = isMockMode ? mockStore.getUsers() : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isMockMode,
        login,
        logout,
        switchUser,
        availableDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
