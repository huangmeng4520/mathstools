
import { MistakeRecord, User, AuthResponse, AddMistakePayload, VisualComponentData } from '../types';

/**
 * API Service Layer
 * 
 * Configured for Real Backend at http://43.153.53.145:4000/
 */

// --- CONFIGURATION ---
const USE_MOCK_API = true; 
const BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'math_master_mistakes_v2';
const TOKEN_KEY = 'math_master_token';
const MOCK_DELAY = 500;

// --- MOCK DATA (From mistakedata.json) ---
const MOCK_DATA = {
    "data": [
        {
            "_id": "692995ae29104ef7e4f099ab",
            "userId": "6929669e29104ef7e4f098d7",
            "originalMistakeId": "692973dd29104ef7e4f09978",
            "originalImage": {
                "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/、lCVtNlrc5s7D0n9KvWC1eJniQdKOL09CcMK7KVDfZW8jLbsdx4IdKf/T0I/On8rxFhRfE+22FGoYH8HetEqTJAUD/",
                "fileId": "local-1764320693680",
                "_id": "6929678729104ef7e4f09904"
            },
            "content": {
                "visualComponent": {
                    "type": "math"
                },
                "html": "<p class=\"text-gray-900 text-2xl/3xl mb-4\">8岁的小红和爸爸、妈妈三人去吃自助火锅，有下面两种付款方式，但不能一起使，用哪种付款方式更省钱？省多少钱？</p><div class=\"border border-gray-300 rounded-lg p-4\"><div class=\"grid grid-cols-2 gap-4 text-gray-900 text-2xl/3xl font-bold mb-2\"><div>前台付款</div><div>网络团购</div></div><div class=\"grid grid-cols-2 gap-4 text-gray-900 text-2xl/3xl\"><div><p>成人: <span class=\"font-bold\">73</span>元/人</p><p>儿童: <span class=\"font-bold\">48</span>元/人</p></div><div><p><span class=\"font-bold\">62</span>元/人</p></div></div></div>",
                "visualComponents": [
                    {
                        "type": "math"
                    }
                ],
                "_id": "6929678729104ef7e4f09905"
            },
            "answer": "网络团购更省钱，可以节省8元。",
            "explanation": "### 题目分析\n小红今年6.8岁，所以她属于儿童。爸爸妈妈是成人，所以是2个成人和1个儿童。\n题目要求比较两种付款方式的费用，并计算哪种更省钱，省多少钱。\n\n### 解题步骤\n**1. 计算前台付款的总费用：**\n*   有2位成人（爸爸、妈妈），每位成人73元。\n*   有1位儿童（小红），每位儿童48元。\n*   前台付款总费用 = 成人费用 + 儿童费用\n    $$ = (2 \\times 73) + (1 \\times 48) $$\n    $$ = 146 + 48 $$\n    $$ = 194 \\text{ (元)} $$\n\n**2. 计算网络团购的总费用：**\n*   网络团购是“62元/人”，并且题目说明两种付款方式不能一起使用，这意味着如果选择网络团购，所有3个人（爸爸、妈妈、小红）都按这个价格付费。\n*   网络团购总费用 = 总人数 \\times 每人价格\n    $$ = 3 \\times 62 $$\n    $$ = 186 \\text{ (元)} $$\n\n**3. 比较两种付款方式的费用：**\n*   前台付款：194元\n*   网络团购：186元\n*   因为 $$186 < 194$$，所以网络团购更省钱。\n\n**4. 计算节省的金额：**\n*   节省金额 = 前台付款费用 - 网络团购费用\n    $$ = 194 - 186 $$\n    $$ = 8 \\text{ (元)} $$\n\n### 错误原因分析\n1.  **计算错误：** 小朋友在计算网络团购的总费用时，写的是 $$2 \\times 62 + 48 = 124 + 48 = 192$$。这里有两个错误：\n    *   首先，$$124 + 48$$ 实际结果是 $$172$$，而不是 $$192$$。这是一个计算错误。\n    *   其次，对“网络团购62元/人”的理解可能存在偏差。题目明确说明“但不能一起使”，意思是只能选择一种付款方式。如果选择网络团购，通常意味着所有人都按团购价62元/人计算，而不是将成人按团购价，儿童按前台价（这是混合使用了两种方式，与题意不符）。所以，正确的计算应该是 $$3 \\times 62 = 186$$ 元。\n\n2.  **结论错误：** 由于计算错误，小朋友的最后比较 $$194元 > 192元$$ 也是基于错误的结果。虽然从错误结果看，网络团购（192元）也比前台付款（194元）便宜，但实际金额和节省的金额都计算错了。",
            "tags": [
                "四则运算",
                "比较大小",
                "应用题",
                "购物计算"
            ],
            "status": "active",
            "srs": {
                "nextReviewAt": "2025-11-28T09:12:39.980Z",
                "reviewCount": 0,
                "interval": 1,
                "easeFactor": 2.5,
                "masteryLevel": "new",
                "_id": "6929678729104ef7e4f09906"
            },
            "createdAt": "2025-11-28T09:12:39.982Z",
            "updatedAt": "2025-11-28T09:12:39.982Z",
            "__v": 0
        }
    ],
    "total": 10,
    "page": 1,
    "limit": 5
}

interface PaginatedResponse {
  items: MistakeRecord[];
  total: number;
}

interface ApiService {
  getMistakes: (page: number, limit: number) => Promise<PaginatedResponse>;
  getReviewQueue: () => Promise<MistakeRecord[]>;
  addMistake: (mistake: AddMistakePayload) => Promise<MistakeRecord | MistakeRecord[]>;
  deleteMistake: (id: string) => Promise<void>;
  updateMistake: (id: string, updates: any) => Promise<MistakeRecord>;
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
        // Token invalid
        auth.logout();
        return null;
      }
      
      const user: User = await res.json();
      return user;
    } catch (e) {
      console.warn("Auth Profile Fetch Failed (likely network error), logging out.");
      // 修复：在请求失败时清除token，避免无限循环
      auth.logout();
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth:logout'));
  }
};

// Helper to transform backend data to frontend MistakeRecord
const transformBackendRecord = (mistake: any): MistakeRecord => ({
    id: mistake._id || mistake.id,
    userId: mistake.userId || 'mock-user-1',
    htmlContent: mistake.content?.html || mistake.htmlContent,
    // Normalize Visual Components: 
    // 1. New array field content.visualComponents
    // 2. Old object field content.visualComponent (wrap in array)
    // 3. Fallback flat fields
    visualComponents: mistake.content?.visualComponents || 
                      (mistake.content?.visualComponent ? [mistake.content.visualComponent] : []) || 
                      mistake.visualComponents || 
                      (mistake.visualComponent ? [mistake.visualComponent] : []),
    imageData: mistake.originalImage?.url || mistake.imageData,
    answer: mistake.answer,
    explanation: mistake.explanation,
    tags: mistake.tags || [],
    status: mistake.status || 'active',
    createdAt: new Date(mistake.createdAt).getTime(),
    updatedAt: new Date(mistake.updatedAt).getTime(),
    nextReviewAt: mistake.srs?.nextReviewAt ? new Date(mistake.srs.nextReviewAt).getTime() : Date.now(),
    reviewCount: mistake.srs?.reviewCount || 0,
    masteryLevel: mistake.srs?.masteryLevel || 'new'
});

// --- Mock Implementation (LocalStorage) ---
const MockApi: ApiService = {
  getMistakes: async (page = 1, limit = 5) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Initialize mock data if empty
        const existing = localStorage.getItem(STORAGE_KEY);
        if (!existing) {
             const seedData = MOCK_DATA.data.map(transformBackendRecord);
             localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
        }

        const json = localStorage.getItem(STORAGE_KEY);
        let allMistakes: any[] = json ? JSON.parse(json) : [];
        
        // 1. Filter deleted
        const activeMistakes = allMistakes.filter(m => m.status !== 'deleted');
        
        // 2. Sort by nextReviewAt asc (urgent first) or createdAt desc
        // For better mock experience, let's sort by created desc so new items appear first
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
  getReviewQueue: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const json = localStorage.getItem(STORAGE_KEY);
        let allMistakes: any[] = json ? JSON.parse(json) : [];
        const now = Date.now();
        // Filter for active items where nextReviewAt is in the past (due)
        const due = allMistakes.filter(m => m.status !== 'deleted' && m.nextReviewAt <= now).map(m => ({
           ...m,
           visualComponents: m.visualComponents || (m.visualComponent ? [m.visualComponent] : [])
        }));
        resolve(due);
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
                visualComponents: m.visualComponents, // New array field
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
            // Single insert (adaptation)
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
                userId: 'mock-user-1',
                visualComponents: singleData.visualComponents || (singleData.visualComponent ? [singleData.visualComponent] : [])
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
  updateMistake: async (id, updates) => {
    return new Promise((resolve) => {
      setTimeout(() => {
         const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
         const updated = stored.map((m: MistakeRecord) => {
           if (m.id === id) {
             const cleanUpdates = { ...updates };
             // Map 'html' back to 'htmlContent' for local storage compatibility
             if (cleanUpdates.html) {
                 cleanUpdates.htmlContent = cleanUpdates.html;
                 delete cleanUpdates.html;
             }
             return { ...m, ...cleanUpdates, updatedAt: Date.now() };
           }
           return m;
         });
         localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
         resolve(updated.find((m: MistakeRecord) => m.id === id));
      }, MOCK_DELAY);
    });
  },
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
  } catch (error: any) {
    // Only log unknown errors, not expected session expirations
    if (error.message !== "Session expired") {
      console.error("Fetch Error:", error);
    }
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
      .map(transformBackendRecord);
      
    return { items, total };
  },

  getReviewQueue: async () => {
    const rawItems: any[] = await fetchWithAuth('/api/mistakes/review-queue');
    return rawItems.map(transformBackendRecord);
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
          visualComponents: data.visualComponents, // Pass the array
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