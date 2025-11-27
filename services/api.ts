import { MistakeRecord, User, AuthResponse, AddMistakePayload } from '../types';

/**
 * API Service Layer
 * 
 * Configured for Real Backend at http://localhost:3000
 */

// --- CONFIGURATION ---
const USE_MOCK_API = true; 
const BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'math_master_mistakes_v2';
const TOKEN_KEY = 'math_master_token';
const MOCK_DELAY = 500;

// --- Interface ---
interface PaginatedResponse {
  items: MistakeRecord[];
  total: number;
}

interface ApiService {
  getMistakes: (page: number, limit: number) => Promise<PaginatedResponse>;
  addMistake: (mistake: AddMistakePayload) => Promise<MistakeRecord | MistakeRecord[]>;
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
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordHash }) // Backend expects 'password' usually
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(`连接后端失败。后端返回了HTML而不是JSON，可能是路径错误。`);
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || '登录失败，请检查用户名或密码');
      }
      
      const data: AuthResponse = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    } catch (e: any) {
      console.error("Login Error:", e);
      throw e;
    }
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
        const errorData = await res.json().catch(() => ({}));
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
  getMistakes: async (page = 1, limit = 5) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const json = localStorage.getItem(STORAGE_KEY);
        let allMistakes: MistakeRecord[] = json ? JSON.parse(json) : [];
        
        // 1. Filter deleted
        const activeMistakes = allMistakes.filter(m => m.status !== 'deleted');
        
        // 2. Sort by nextReviewAt asc (urgent first) or createdAt desc
        activeMistakes.sort((a, b) => b.createdAt - a.createdAt);

        // 3. Pagination
        const total = activeMistakes.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const items = activeMistakes.slice(startIndex, endIndex);

        resolve({ items, total });
      }, MOCK_DELAY);
    });
  },
  addMistake: async (data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        // Handle nested data structure if coming from saveNewMistake
        let newRecords: MistakeRecord[] = [];
        let isBulk = false;
        
        if ('mistakes' in data && Array.isArray((data as any).mistakes)) {
            // Bulk insert simulation
            isBulk = true;
            const inputData = data as any;
            newRecords = inputData.mistakes.map((m: any, idx: number) => ({
                id: Date.now().toString() + idx,
                userId: 'mock-user-1',
                imageData: inputData.originalImage.url,
                htmlContent: m.html,
                visualComponent: m.visualComponent, // Ensure visual component is passed
                answer: m.answer,
                explanation: m.explanation,
                tags: m.tags,
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                reviewCount: 0,
                masteryLevel: 'new',
                nextReviewAt: Date.now(),
                originalMistakeId: m.originalMistakeId
            }));
        } else {
            // Single insert
            const singleData = data as any;
             newRecords = [{ 
                ...singleData, 
                id: Date.now().toString(), 
                status: 'active', 
                createdAt: Date.now(), 
                updatedAt: Date.now(), 
                reviewCount: 0, 
                masteryLevel: 'new', 
                nextReviewAt: Date.now(), 
                userId: 'mock-user-1'
            }];
        }
        
        const updatedStorage = [...newRecords, ...stored];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStorage));
        
        if (isBulk) {
          resolve(newRecords);
        } else {
          resolve(newRecords[0]);
        }
      }, MOCK_DELAY);
    });
  },
  deleteMistake: async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        // Soft delete for mock
        const updated = stored.map((m: MistakeRecord) => 
            m.id === id ? { ...m, status: 'deleted' } : m
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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

  try {
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
      throw new Error("Session expired");
    }

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    // Safely handle 204 No Content or empty bodies
    if (res.status === 204) {
      return {} as unknown as T;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
}

const RealApi: ApiService = {
  getMistakes: async (page = 1, limit = 5) => {
    // Pass pagination and filter deleted.
    // IMPORTANT: We manually construct the query string to ensure the comma is NOT encoded.
    // URLSearchParams would encode ',' to '%2C', which some backends might fail to split correctly.
    // Sending literal 'active,processing' ensures backend split(',') works.
    const query = `page=${page}&limit=${limit}&status=active,processing`;

    // Debug log to help identify User ID mismatch issues
    console.debug(`[API] Fetching mistakes. Page: ${page}, Limit: ${limit}`);

    const response: any = await fetchWithAuth(`/api/mistakes?${query}`);
    
    // Expecting response format: { data: [...], total: 100, page: 1, ... }
    // OR array if not updated yet.
    
    let rawItems: any[] = [];
    let total = 0;

    if (Array.isArray(response)) {
        // Fallback if backend doesn't support pagination object yet
        rawItems = response;
        total = response.length;
    } else if (response.data && Array.isArray(response.data)) {
        // Standard paginated response
        rawItems = response.data;
        total = response.total || response.count || rawItems.length;
    }

    if (rawItems.length === 0) {
      console.warn("[API] Received 0 items. Check if your current logged-in User ID matches the data owner in MongoDB.");
    }

    const items = rawItems
      .filter((mistake: any) => mistake.status !== 'deleted') // Extra safety
      .map((mistake: any) => ({
        id: mistake._id || mistake.id,
        userId: mistake.userId,
        htmlContent: mistake.content?.html || mistake.htmlContent,
        visualComponent: mistake.content?.visualComponent || mistake.visualComponent,
        imageData: mistake.originalImage?.url || mistake.imageData,
        answer: mistake.answer,
        explanation: mistake.explanation,
        tags: mistake.tags || [],
        status: mistake.status,
        createdAt: new Date(mistake.createdAt).getTime(),
        updatedAt: new Date(mistake.updatedAt).getTime(),
        nextReviewAt: mistake.srs?.nextReviewAt ? new Date(mistake.srs.nextReviewAt).getTime() : Date.now(),
        reviewCount: mistake.srs?.reviewCount || 0,
        masteryLevel: mistake.srs?.masteryLevel || 'new'
      }));
      
    return { items, total };
  },
  
  addMistake: async (data) => {
    // Check if data is bulk format
    if ('mistakes' in data && 'originalImage' in data) {
      return fetchWithAuth('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } else {
      // Single record adaptation
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
          visualComponent: data.visualComponent,
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