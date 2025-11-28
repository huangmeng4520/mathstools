

import { ReactNode } from 'react';

export interface Question {
  id: string;
  category: string;
  title: string;
  content: ReactNode;
  options: Option[];
  correctId: string;
  explanation: ReactNode;
  hint?: string;
  mistakeId?: string; // Links back to the original mistake for tracking
}

export interface Option {
  id: string;
  text: string;
}

export enum QuizState {
  START,
  PLAYING,
  COMPLETED
}

export interface ReviewResult {
  mistakeId: string;
  success: boolean;
}

// --- Visual Component Types ---
export type VisualComponentType = 'clock' | 'block' | 'numberLine' | 'fraction' | 'geometry' | 'lineSegment' | 'emoji' | 'grid' | 'none';

export interface VisualComponentData {
  type: VisualComponentType;
  props: Record<string, any>; // Flexible props to match backend JSON
}

// --- Backend Aligned Data Models ---

export type MasteryLevel = 'new' | 'learning' | 'reviewing' | 'mastered';
export type MistakeStatus = 'processing' | 'active' | 'archived' | 'deleted';

export interface User {
  id: string;
  username: string;
  gradeLevel?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MistakeRecord {
  id: string;
  userId?: string; // For future multi-user support
  originalMistakeId?: string; // Reference to the original mistake for variations
  
  // Image Info
  imageData?: string; // Base64 string (Frontend Mock) or URL (Backend)
  
  // Content
  htmlContent: string;
  visualComponents?: VisualComponentData[]; // Changed from single object to array
  answer: string;
  explanation: string;
  tags: string[];
  
  // Process Status
  status: MistakeStatus;

  // SRS (Spaced Repetition System) Stats
  createdAt: number;
  updatedAt: number;
  nextReviewAt: number; // Timestamp
  reviewCount: number;
  masteryLevel: MasteryLevel;
}

export interface MistakeData {
  html: string;
  answer: string;
  explanation: string;
  tags: string[];
  visualComponents?: VisualComponentData[]; // Changed from single object to array
  originalMistakeId?: string;
}

export interface BulkMistakeInput {
  originalImage: {
    url: string;
    fileId: string;
  };
  mistakes: MistakeData[];
}

export type MistakeRecordInput = Omit<MistakeRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

export type AddMistakePayload = MistakeRecordInput | BulkMistakeInput;