import { MistakeRecord, User, AuthResponse } from '../types';

/**
 * API Service Layer
 * 
 * Configured for Real Backend at http://localhost:3000
 */

// --- CONFIGURATION ---
// CHANGED: Reverted to TRUE to ensure app runs without backend connection errors by default.
// Set this to FALSE only when your local backend (localhost:3000) is running and CORS is configured.
const USE_MOCK_API = false; 
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
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || '登录失败，请检查用户名或密码');
    }
    
    const data: AuthResponse = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },

  register: async (username: string, passwordHash: string, gradeLevel: number = 3): Promise<User> => {
    if (USE_MOCK_API) {
      return auth.login(username, passwordHash);
    }

    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordHash, gradeLevel })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '注册失败，用户名可能已存在');
      }

      const data: AuthResponse = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    } catch (e) {
      console.error("Auth Register Error:", e);
      throw e;
    }
  },

  getProfile: async (): Promise<User | null> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    if (USE_MOCK_API) {
      return { id: 'mock-user-1', username: 'Guest', gradeLevel: 3 };
    }

    try {
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'POST', 
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
      console.warn("Auth Profile Fetch Failed (likely network error), logging out.");
      // 修复：在请求失败时清除token，避免无限循环
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
  }
};

// --- Mock Implementation (LocalStorage) ---
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
        const newRecord = { 
          ...data, 
          id: Date.now().toString(), 
          status: 'active' as const, 
          createdAt: Date.now(), 
          updatedAt: Date.now(), 
          reviewCount: 0, 
          masteryLevel: 'new' as const, 
          nextReviewAt: Date.now(),
          userId: 'mock-user-1'
        };
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
  reviewMistake: async (id, success) => { 
    return new Promise((resolve) => {
      setTimeout(() => {
         const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
         const updated = stored.map((m: MistakeRecord) => {
           if (m.id === id) {
             return {
               ...m,
               reviewCount: m.reviewCount + 1,
               nextReviewAt: Date.now() + (success ? 86400000 * 2 : 86400000)
             }
           }
           return m;
         });
         localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
         resolve(updated.find((m: MistakeRecord) => m.id === id));
      }, MOCK_DELAY);
    });
  }
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
    throw new Error(`连接后端失败。请确保后端服务运行在 ${BASE_URL}`);
  }

  if (res.status === 401) {
    auth.logout();
    // 移除window.location.reload()调用，避免页面刷新
    // 改为返回错误，让调用者处理
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

const RealApi: ApiService = {
  getMistakes: async () => {
    const response = await fetchWithAuth('/api/mistakes');
    // 从后端返回的对象中提取 data 数组
    const mistakes = response.data || [];
    // 转换后端数据结构以匹配前端期望的格式
    return mistakes.map(mistake => ({
      ...mistake,
      htmlContent: mistake.content.html,
      visualComponent: mistake.content.visualComponent,
      imageData: mistake.originalImage.url,
      nextReviewAt: new Date(mistake.srs.nextReviewAt).getTime(),
      reviewCount: mistake.srs.reviewCount,
      masteryLevel: mistake.srs.masteryLevel
    }));
  },
  
  addMistake: async (data) => {
    // Check if data already has the correct format for the backend
    if ('mistakes' in data && 'originalImage' in data) {
      // Data is already in the correct format, send it directly
      return fetchWithAuth('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } else {
      // Data is a single mistake record, format it for the backend
      const requestData = {
        originalImage: {
          url: data.imageData || '',
          fileId: `local-${Date.now()}`
        },
        mistakes: [{
          html: data.htmlContent,
          answer: data.answer,
          explanation: data.explanation,
          tags: data.tags,
          originalMistakeId: data.originalMistakeId
        }]
      };
      return fetchWithAuth('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
    }
  },
  
  deleteMistake: async (id) => {
      await fetchWithAuth(`/api/mistakes/${id}`, { method: 'DELETE' });
  },
  
  updateMistake: async (id, updates) => fetchWithAuth(`/api/mistakes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  }),
  
  reviewMistake: async (id, success) => fetchWithAuth(`/api/mistakes/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ success, duration: 0 })
  })
};

export const api = USE_MOCK_API ? MockApi : RealApi;