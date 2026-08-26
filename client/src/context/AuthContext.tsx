import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, workspaceName?: string) => Promise<void>;
  logout: () => void;
  setWorkspace: (ws: Workspace) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pulsenote_token'));
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setWorkspaces(res.data.workspaces || []);

      const savedWsId = localStorage.getItem('pulsenote_ws_id');
      const found = res.data.workspaces.find((w: Workspace) => w.id === savedWsId);
      if (found) {
        setWorkspaceState(found);
      } else if (res.data.workspaces.length > 0) {
        setWorkspaceState(res.data.workspaces[0]);
        localStorage.setItem('pulsenote_ws_id', res.data.workspaces[0].id);
      }
    } catch (err) {
      console.error('Failed to load current user context:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser, workspace: newWs } = res.data;

    localStorage.setItem('pulsenote_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newWs) {
      setWorkspaceState(newWs);
      localStorage.setItem('pulsenote_ws_id', newWs.id);
    }
  };

  const register = async (name: string, email: string, password: string, workspaceName?: string) => {
    const res = await api.post('/auth/register', { name, email, password, workspaceName });
    const { token: newToken, user: newUser, workspace: newWs } = res.data;

    localStorage.setItem('pulsenote_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newWs) {
      setWorkspaceState(newWs);
      localStorage.setItem('pulsenote_ws_id', newWs.id);
    }
  };

  const logout = () => {
    localStorage.removeItem('pulsenote_token');
    localStorage.removeItem('pulsenote_ws_id');
    setToken(null);
    setUser(null);
    setWorkspaceState(null);
    setWorkspaces([]);
  };

  const setWorkspace = (ws: Workspace) => {
    setWorkspaceState(ws);
    localStorage.setItem('pulsenote_ws_id', ws.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        workspace,
        workspaces,
        loading,
        login,
        register,
        logout,
        setWorkspace
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
