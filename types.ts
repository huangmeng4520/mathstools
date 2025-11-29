import { ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  gradeLevel?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface VisualComponentData {
  type: 'clock' | 'numberLine' | 'fraction' | 'geometry' | 'lineSegment' | 'emoji' | 'grid' | 'die';
  props: Record<string, any>;
}

export interface MistakeRecord {
  id: string;
  userId: string;
  htmlContent: string;
  answer: string;
  explanation: string;
  tags: string[];
  visualComponents?: VisualComponentData[];
  // For legacy/compatibility
  visualComponent?: VisualComponentData; 
  imageData?: string;
  status: 'active' | 'deleted' | 'processing';
  createdAt: number;
  updatedAt: number;
  nextReviewAt: number;
  reviewCount: number;
  masteryLevel: 'new' | 'learning' | 'mastered';
  originalMistakeId?: string;
  // For MongoDB compatibility
  _id?: string;
}

export type AddMistakePayload = 
  | {
      // Bulk / AI Analysis result
      originalImage: { url: string; fileId: string };
      mistakes: Array<{
        html: string;
        answer: string;
        explanation: string;
        tags: string[];
        visualComponents?: VisualComponentData[];
        originalMistakeId?: string;
        visualComponent?: VisualComponentData; // legacy support
      }>;
    }
  | {
      // Single Variation / Manual
      htmlContent: string;
      answer: string;
      explanation: string;
      tags: string[];
      visualComponents?: VisualComponentData[];
      imageData?: string;
      originalMistakeId?: string;
      nextReviewAt?: number;
      reviewCount?: number;
      masteryLevel?: 'new' | 'learning' | 'mastered';
      visualComponent?: VisualComponentData; // legacy
    };

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  mistakeId?: string;
  category: string;
  title: string;
  questionType?: 'judgment' | 'selection' | 'completion';
  content: ReactNode;
  options: Option[];
  correctId: string;
  explanation: ReactNode;
  hint?: string;
}

export interface ReviewResult {
  mistakeId: string;
  success: boolean;
}

export enum QuizState {
  START = 'START',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED'
}

export interface LineSegmentRow {
  label?: string;
  segments: Array<{
    value: number;
    label?: string;
    color?: string;
    type?: 'solid' | 'dotted' | 'dashed';
  }>;
}

export interface LineSegmentBrace {
  rowIndex: number;
  start: number;
  end: number;
  label: string;
  position?: 'top' | 'bottom';
}
