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
export type VisualComponentType = 'clock' | 'block' | 'numberLine' | 'fraction' | 'geometry' | 'none';

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
  
  // Image Info
  imageData?: string; // Base64 string (Frontend Mock) or URL (Backend)
  
  // Content
  htmlContent: string;
  visualComponent?: VisualComponentData;
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