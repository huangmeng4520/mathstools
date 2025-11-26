import { MistakeRecord, MistakeStatus } from '../types';

/**
 * API Service Layer
 * 
 * This file acts as the bridge between the frontend components and the data source.
 * Currently, it implements a "Mock Adapter" using LocalStorage to simulate a backend.
 * 
 * To switch to a real backend:
 * 1. Set USE_MOCK_API = false
 * 2. Implement the 'RealApi' methods using fetch/axios calling your Node.js endpoints.
 */

const USE_MOCK_API = true;
const STORAGE_KEY = 'math_master_mistakes_v2';
const MOCK_DELAY = 600; // Simulate network latency in ms

// --- Mock Data ---
const MOCK_INITIAL_DATA: MistakeRecord[] = [
  {
    id: 'mock-1',
    status: 'active',
    htmlContent: '<div class="text-3xl font-bold text-gray-900">计算：14 × 3 = ?</div>',
    answer: '42',
    explanation: '1. 个位 4×3=12，写2进1。\n2. 十位 1×3=3，加上进位1得4。\n3. 结果 42。',
    tags: ['乘法', '进位'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nextReviewAt: Date.now() - 10000, // Ready for review
    reviewCount: 0,
    masteryLevel: 'new'
  }
];

// --- Interface ---
interface ApiService {
  getMistakes: () => Promise<MistakeRecord[]>;
  addMistake: (mistake: Omit<MistakeRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<MistakeRecord>;
  deleteMistake: (id: string) => Promise<void>;
  updateMistake: (id: string, updates: Partial<MistakeRecord>) => Promise<MistakeRecord>;
  reviewMistake: (id: string, success: boolean) => Promise<MistakeRecord>;
}

// --- Mock Implementation ---
const MockApi: ApiService = {
  getMistakes: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) {
          resolve(MOCK_INITIAL_DATA);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_INITIAL_DATA));
        } else {
          resolve(JSON.parse(json));
        }
      }, MOCK_DELAY);
    });
  },

  addMistake: async (data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        const newRecord: MistakeRecord = {
          ...data,
          id: Date.now().toString(), // Simple ID generation
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          reviewCount: 0,
          masteryLevel: 'new',
          // Default next review is now (immediate practice) or tomorrow
          nextReviewAt: Date.now(), 
        };

        const updated = [newRecord, ...stored];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        resolve(newRecord);
      }, MOCK_DELAY);
    });
  },

  deleteMistake: async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored: MistakeRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        // Soft delete or hard delete? Let's do hard delete for mock
        const updated = stored.filter(m => m.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        resolve();
      }, MOCK_DELAY);
    });
  },

  updateMistake: async (id, updates) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const stored: MistakeRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const index = stored.findIndex(m => m.id === id);
        
        if (index === -1) {
          reject(new Error("Mistake not found"));
          return;
        }

        const updatedRecord = { ...stored[index], ...updates, updatedAt: Date.now() };
        stored[index] = updatedRecord;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        resolve(updatedRecord);
      }, MOCK_DELAY);
    });
  },

  reviewMistake: async (id, success) => {
    // This logic mimics the backend SRS algorithm
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const stored: MistakeRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            const index = stored.findIndex(m => m.id === id);
            
            if (index === -1) {
              reject(new Error("Mistake not found"));
              return;
            }
            
            const mistake = stored[index];
            
            // SRS Algorithm Logic
            let nextInterval = 24 * 60 * 60 * 1000; // Default 1 day
            let newMastery: MistakeRecord['masteryLevel'] = mistake.masteryLevel;
            
            if (success) {
                const count = mistake.reviewCount + 1;
                if (count === 1) nextInterval = 1 * 24 * 60 * 60 * 1000; // 1 day
                else if (count === 2) nextInterval = 3 * 24 * 60 * 60 * 1000; // 3 days
                else nextInterval = (count * 7) * 24 * 60 * 60 * 1000; // Weekly growth
                
                newMastery = count > 2 ? 'mastered' : 'learning';
            } else {
                nextInterval = 0; // Immediate review
                newMastery = 'learning';
            }

            const updatedRecord: MistakeRecord = {
                ...mistake,
                reviewCount: success ? mistake.reviewCount + 1 : mistake.reviewCount,
                nextReviewAt: Date.now() + nextInterval,
                masteryLevel: newMastery,
                updatedAt: Date.now()
            };

            stored[index] = updatedRecord;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            resolve(updatedRecord);
        }, MOCK_DELAY);
    });
  }
};

// --- Real API Stub (For Future) ---
const RealApi: ApiService = {
  getMistakes: async () => {
    const res = await fetch('/api/mistakes');
    return res.json();
  },
  addMistake: async (data) => {
    const res = await fetch('/api/mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteMistake: async (id) => {
      await fetch(`/api/mistakes/${id}`, { method: 'DELETE' });
  },
  updateMistake: async (id, updates) => {
    const res = await fetch(`/api/mistakes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    return res.json();
  },
  reviewMistake: async (id, success) => {
    const res = await fetch(`/api/mistakes/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success })
    });
    return res.json();
  }
};

// Export the selected implementation
export const api = USE_MOCK_API ? MockApi : RealApi;
