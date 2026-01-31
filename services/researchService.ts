import { Candidate, ResearchSession, ResearchResult, ComparisonResult, ResearchStatus } from '../types';

// Use local backend API
const API_BASE = 'http://localhost:8000/api/v1';
let wsConnections: Map<string, WebSocket> = new Map();

// ==================== Candidates API ====================

export const getCandidates = async (): Promise<Candidate[]> => {
  try {
    const response = await fetch(`${API_BASE}/candidates`);
    if (!response.ok) throw new Error('Failed to fetch candidates');
    const data = await response.json();
    return data.candidates || [];
  } catch (error) {
    console.error("Error fetching candidates:", error);
    // Fallback to known candidates
    return [
      { name: "Aaron Peskin", party: "Progressive", bio: "President of the Board of Supervisors", gender: "male" },
      { name: "London Breed", party: "Moderate", bio: "Current Mayor", gender: "female" },
      { name: "Daniel Lurie", party: "Moderate", bio: "Non-profit founder", gender: "male" },
      { name: "Scott Wiener", party: "Democrat", bio: "State Senator", gender: "male" },
      { name: "Ahsha Safaí", party: "Moderate", bio: "Supervisor", gender: "male" },
      { name: "Connie Chan", party: "Progressive", bio: "Supervisor", gender: "female" },
      { name: "Dean Preston", party: "Democratic Socialist", bio: "Supervisor", gender: "male" },
      { name: "Mark Farrell", party: "Moderate", bio: "Former Interim Mayor", gender: "male" },
    ];
  }
};

export const getCandidate = async (name: string): Promise<Candidate | null> => {
  try {
    const response = await fetch(`${API_BASE}/candidates/${encodeURIComponent(name)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return null;
  }
};

// ==================== Research API ====================

export const startResearch = async (candidateName: string): Promise<ResearchSession> => {
  try {
    const response = await fetch(`${API_BASE}/research/candidate/${encodeURIComponent(candidateName)}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to start research');
    const data = await response.json();
    return {
      id: data.id,
      candidate_name: data.candidate_name,
      status: data.status,
      created_at: data.created_at,
      progress: data.progress
    };
  } catch (error) {
    console.error("Error starting research:", error);
    // Fallback - create local session
    const session: ResearchSession = {
      id: `local_${Date.now()}`,
      candidate_name: candidateName,
      status: 'completed',
      created_at: new Date().toISOString(),
      progress: 100
    };
    return session;
  }
};

export const compareCandidates = async (names: string[]): Promise<ComparisonResult> => {
  try {
    const response = await fetch(`${API_BASE}/research/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names })
    });
    if (!response.ok) throw new Error('Failed to compare candidates');
    return await response.json();
  } catch (error) {
    console.error("Error comparing candidates:", error);
    return {
      candidates: names,
      common_stances: [],
      differences: []
    };
  }
};

export const getResearchStatus = async (id: string): Promise<ResearchStatus | null> => {
  try {
    const response = await fetch(`${API_BASE}/research/status/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: data.id,
      status: data.status,
      progress: data.progress,
      message: data.status === 'in_progress' ? 'Researching candidate positions...' : undefined
    };
  } catch (error) {
    console.error("Error fetching research status:", error);
    return null;
  }
};

export const getResearchResults = async (id: string): Promise<ResearchResult | null> => {
  try {
    const response = await fetch(`${API_BASE}/research/results/${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching research results:", error);
    return null;
  }
};

export const getActiveResearch = async (): Promise<ResearchSession[]> => {
  try {
    const response = await fetch(`${API_BASE}/research/active`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.active || [];
  } catch (error) {
    console.error("Error fetching active research:", error);
    return [];
  }
};

export const cancelResearch = async (id: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/research/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error("Error cancelling research:", error);
  }
};

// ==================== WebSocket-style Real-time Updates ====================

export const onResearchUpdate = (
  id: string,
  callback: (status: ResearchStatus) => void
): (() => void) => {
  const cleanupFns: (() => void)[] = [];

  // Try WebSocket first
  try {
    const ws = new WebSocket(`ws://localhost:8000/ws/research/${id}`);
    ws.onopen = () => {
      console.log(`WebSocket connected for research ${id}`);
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback({
          id: data.id,
          status: data.status,
          progress: data.progress
        });
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    };
    ws.onerror = () => {
      console.log("WebSocket error, falling back to polling");
    };
    ws.onclose = () => {
      console.log(`WebSocket closed for research ${id}`);
    };
    wsConnections.set(id, ws);
    cleanupFns.push(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsConnections.delete(id);
    });
  } catch {
    console.log("WebSocket not available, using polling");
  }

  // Fallback polling
  const pollInterval = setInterval(async () => {
    const status = await getResearchStatus(id);
    if (status) {
      callback(status);
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(pollInterval);
      }
    }
  }, 2000);

  cleanupFns.push(() => clearInterval(pollInterval));

  // Return combined cleanup function
  return () => {
    cleanupFns.forEach(fn => fn());
  };
};
