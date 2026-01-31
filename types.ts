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