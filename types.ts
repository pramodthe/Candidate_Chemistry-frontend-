export interface CandidateMatch {
  name: string;
  alignment: 'supports' | 'opposes';
  source_link: string;
  party?: string; // Added for dummy profile richness
  bio?: string;   // Added for dummy profile richness
  gender?: 'male' | 'female'; // Added for voice selection
}

export interface StanceCard {
  stance_id: string;
  question: string;
  context: string;
  analysis: string; // Detailed simple explanation
  candidate_matches: CandidateMatch[];
}

export interface UserChoice {
  stanceId: string;
  choice: 'supports' | 'opposes' | 'skip';
}

export interface MatchResult {
  candidateName: string;
  score: number;
  totalAgreements: number;
  totalDisagreements: number;
  totalPolicies: number;
  party?: string;
  bio?: string;
  gender?: 'male' | 'female';
}

// Research API Types
export interface Candidate {
  name: string;
  party?: string;
  bio?: string;
  gender?: 'male' | 'female';
  stance_summary?: string;
}

export interface ResearchSession {
  id: string;
  candidate_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  progress?: number;
}

export interface ResearchResult {
  id: string;
  candidate_name: string;
  stances: StanceCard[];
  summary: string;
}

export interface ComparisonResult {
  candidates: string[];
  common_stances: StanceCard[];
  differences: StanceCard[];
}

export interface ResearchStatus {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'loading' | 'error' | 'result';
}