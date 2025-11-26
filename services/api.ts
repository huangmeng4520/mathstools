import { MistakeRecord, User, AuthResponse } from '../types';

/**
 * API Service Layer
 * 
 * Configured for Real Backend at http://localhost:3000
 */

// --- CONFIGURATION ---
const USE_MOCK_API = false; // Set to FALSE to use Real Backend
const BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'math_master_mistakes_v2';
const TOKEN_KEY = 'math_master_token';
const MOCK_DELAY = 500;

// --- Interface ---
interface ApiService {
  getMistakes: () => Promise<MistakeRecord[]>;
  addMistake: (mistake: Omit<MistakeRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<MistakeRecord>;
  deleteMistake: (id: string) => Promise<void>;
  updateMistake: (id: string, updates: Partial<MistakeRecord>) => Promise<MistakeRecord>;
  reviewMistake: (id: string, success: boolean) => Promise<MistakeRecord>;
}

// --- AUTH SERVICE ---
export const auth = {
  login: async (username: string, passwordHash: string): Promise<User> => {
    if (USE_MOCK_API) {
      // Mock Login
      return new Promise((resolve) => {
        setTimeout(() => {
          localStorage.setItem(TOKEN_KEY, 'mock-token');
          resolve({ id: 'mock-user-1', username, gradeLevel: 3 });
        }, 500);
      });
    }
    
    // Real Login
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordHash }) // Backend expects 'password' usually
    });
    
    if (!res.ok) throw new Error('登录失败，请检查用户名或密码');
    
    const data: AuthResponse = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },

  register: async (username: string, passwordHash: string): Promise<User> => {
    if (USE_MOCK_API) {
      return auth.login(username, passwordHash);
    }

    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordHash })
    });

    if (!res.ok) throw new Error('注册失败，用户名可能已存在');

    const data: AuthResponse = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },

  getProfile: async (): Promise<User | null> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    if (USE_MOCK_API) {
      return { id: 'mock-user-1', username: 'Guest', gradeLevel: 3 };
    }

    try {
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'POST', // Backend spec says POST for profile
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      
      const user: User = await res.json();
      return user;
    } catch (e) {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
  }
};

// --- Mock Implementation (LocalStorage) ---
// ... (Keeping Mock Logic for fallback if needed, but not used when USE_MOCK_API = false)
const MockApi: ApiService = {
  getMistakes: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const json = localStorage.getItem(STORAGE_KEY);
        resolve(json ? JSON.parse(json) : []);
      }, MOCK_DELAY);
    });
  },
  addMistake: async (data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const newRecord = { ...data, id: Date.now().toString(), status: 'active' as const, createdAt: Date.now(), updatedAt: Date.now(), reviewCount: 0, masteryLevel: 'new' as const, nextReviewAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...stored]));
        resolve(newRecord as MistakeRecord);
      }, MOCK_DELAY);
    });
  },
  deleteMistake: async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.filter((m: any) => m.id !== id)));
        resolve();
      }, MOCK_DELAY);
    });
  },
  updateMistake: async (id, updates) => { return Promise.resolve({} as any); },
  reviewMistake: async (id, success) => { return Promise.resolve({} as any); }
};

// --- Real API Helper ---
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
     // This usually happens if the backend is down and the frontend dev server serves index.html
    throw new Error(`连接后端失败。请确保后端服务运行在 ${BASE_URL}`);
  }

  if (res.status === 401) {
    auth.logout();
    window.location.reload(); // Force re-login
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

const RealApi: ApiService = {
  getMistakes: async () => fetchWithAuth('/api/mistakes'),
  
  addMistake: async (data) => fetchWithAuth('/api/mistakes', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  deleteMistake: async (id) => {
      await fetchWithAuth(`/api/mistakes/${id}`, { method: 'DELETE' });
  },
  
  updateMistake: async (id, updates) => fetchWithAuth(`/api/mistakes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  
  reviewMistake: async (id, success) => fetchWithAuth(`/api/mistakes/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ success })
  })
};

export const api = USE_MOCK_API ? MockApi : RealApi;
