export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER' | 'OWNER';
  companyId: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Prospect {
  id: string;
  companyId: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  score: number;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST';
  lastActivity: string;
  createdAt: string;
}

export interface ProspectSource {
  id: string;
  name: string;
}

export interface SocialSignal {
  id: string;
  prospectId: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  prospectId: string;
  title: string;
  value?: number | null;
  stage: 'DISCOVERY' | 'PRESENTATION' | 'NEGOTIATION' | 'WON' | 'LOST';
  confidence: number;
  aiAnalysis?: any;
  createdAt: string;
}

export interface WhatsappInstance {
  id: string;
  companyId: string;
  name: string;
  phone?: string | null;
  status: 'CONNECTED' | 'DISCONNECTED' | 'PAUSED';
  qrCode?: string | null;
  createdAt: string;
}

export interface Agent {
  id: string;
  companyId: string;
  whatsappInstanceId?: string | null;
  name: string;
  type: 'SALES' | 'SUPPORT' | 'BOOKING' | 'LEAD_GEN';
  prompt: string;
  objective: string;
  schedule?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface AgentSession {
  id: string;
  agentId: string;
  contactPhone: string;
  status: 'ACTIVE' | 'INACTIVE';
  messages: any[];
  createdAt: string;
}

export interface Workflow {
  id: string;
  companyId: string;
  name: string;
  type: 'DISCOVERY' | 'ENRICHMENT' | 'WHATSAPP' | 'REPORT';
  status: 'ACTIVE' | 'INACTIVE';
  n8nWebhookUrl?: string | null;
  lastRun?: string | null;
  nextRun?: string | null;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  error?: string | null;
  durationMs?: number | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  companyId: string;
  userId?: string | null;
  type: string;
  description: string;
  createdAt: string;
}

export interface AIScoringResult {
  score: number; // 0-100
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  detectedProblem: string;
  recommendedSolution: string;
  purchaseProbability: string; // e.g. "75%"
  suggestedMessage: string;
  techStackDetected?: string[];
  salesPitchStrategy?: string;
  predictedObjection?: string;
}
