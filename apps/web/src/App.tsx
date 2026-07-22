import React, { useState, useEffect } from 'react';
import { AgentWorkspace } from './AgentWorkspace';
import { AgentBuilding3D } from './AgentBuilding3D';
import { cyberAudio } from './CyberAudio';
import { WhatsAppSimulator } from './WhatsAppSimulator';
import { CinematicHQExperience } from './CinematicHQExperience';
import {
  LayoutDashboard,
  Users,
  BrainCircuit,
  MessageSquare,
  Bot,
  Cpu,
  Settings,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Send,
  Zap,
  Globe,
  Phone,
  Clock,
  Briefcase,
  MapPin,
  Mail,
  ShieldCheck,
  LogOut,
  Calendar,
  Sparkles,
  Trash2,
  Radio,
  Activity as ActivityIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Prospect, WhatsappInstance, Agent, Workflow, WorkflowRun, Activity, AIScoringResult } from '@leadforge/shared';

// API Service URL (Read strictly from Environment Variables)
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('leadforge_auth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('leadforge_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'prospects' | 'ai-analyst' | 'whatsapp' | 'agents' | 'workflows' | 'settings'>(() => {
    const saved = localStorage.getItem('leadforge_active_tab');
    return (saved as any) || 'dashboard';
  });
  const [agentViewMode, setAgentViewMode] = useState<'building' | 'workspace' | 'cards'>(() => {
    const saved = localStorage.getItem('leadforge_agent_view_mode');
    return (saved as any) || 'building';
  });

  useEffect(() => {
    localStorage.setItem('leadforge_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('leadforge_agent_view_mode', agentViewMode);
  }, [agentViewMode]);

  // App States
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsappInstance[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [kpis, setKpis] = useState<any>({
    leadsToday: 0,
    leadsThisWeek: 0,
    hotOpportunities: 0,
    conversationsActive: 0,
    whatsappConnected: 0,
    agentsRunning: 0
  });
  const [chartData, setChartData] = useState<any>({
    leadsBySource: [],
    conversionRates: [],
    scoreDistribution: [],
    weeklyActivity: []
  });

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Modals state
  const [showAddProspectModal, setShowAddProspectModal] = useState<boolean>(false);
  const [showScrapeModal, setShowScrapeModal] = useState<boolean>(false);
  const [showAddInstanceModal, setShowAddInstanceModal] = useState<boolean>(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState<boolean>(false);
  const [showAddWorkflowModal, setShowAddWorkflowModal] = useState<boolean>(false);
  const [qrCodeModal, setQrCodeModal] = useState<{ open: boolean; instanceId: string; qrCodeUrl: string | null; loading: boolean } | null>(null);
  const [showWhatsappSim, setShowWhatsappSim] = useState<boolean>(false);
  const [simLead, setSimLead] = useState<{ name: string; phone: string }>({ name: 'Restaurante El Portal Bogotá', phone: '+57 310 987 6543' });

  // Forms state
  const [newProspect, setNewProspect] = useState({ name: '', contactName: '', phone: '', email: '', website: '', industry: '', location: '', status: 'NEW' as any });
  const [scrapeQuery, setScrapeQuery] = useState({ query: '', limit: 5 });
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newAgent, setNewAgent] = useState({ name: '', type: 'SALES' as any, color: '#06B6D4', prompt: '', objective: '', schedule: '09:00 - 18:00', whatsappInstanceId: '', n8nWebhookUrl: '', status: 'ACTIVE' as any });
  const [newWorkflow, setNewWorkflow] = useState<{ id?: string; name: string; type: string; n8nWebhookUrl: string; status: string }>({ id: '', name: '', type: 'WHATSAPP', n8nWebhookUrl: '', status: 'ACTIVE' });
  const [workflowTestResult, setWorkflowTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);

  const handleCopyAgentId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(`id=eq.${id}`);
    setCopiedAgentId(id);
    setTimeout(() => setCopiedAgentId(null), 2500);
  };

  // AI Analyst state
  const [aiForm, setAiForm] = useState({ companyName: '', website: '', description: '', industry: '' });
  const [aiResult, setAiResult] = useState<AIScoringResult | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);

  // Authentication Handlers
  const handleLogout = () => {
    try { cyberAudio.playClick(); } catch (e) { }
    localStorage.removeItem('leadforge_auth');
    localStorage.removeItem('leadforge_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Background loading trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch initial data in parallel for lighting fast load speed
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [pRes, wRes, aRes, wfRes, runsRes, actRes, kpiRes, chartRes] = await Promise.all([
          fetch(`${API_URL}/api/prospects`),
          fetch(`${API_URL}/api/whatsapp/instances`),
          fetch(`${API_URL}/api/agents`),
          fetch(`${API_URL}/api/workflows`),
          fetch(`${API_URL}/api/workflows/runs`),
          fetch(`${API_URL}/api/activities`),
          fetch(`${API_URL}/api/analytics/kpis`),
          fetch(`${API_URL}/api/analytics/charts`)
        ]);

        if (pRes.ok) setProspects(await pRes.json());
        if (wRes.ok) setWhatsappInstances(await wRes.json());
        if (aRes.ok) setAgents(await aRes.json());
        if (wfRes.ok) setWorkflows(await wfRes.json());
        if (runsRes.ok) setWorkflowRuns(await runsRes.json());
        if (actRes.ok) setActivities(await actRes.json());
        if (kpiRes.ok) setKpis(await kpiRes.json());
        if (chartRes.ok) setChartData(await chartRes.json());
      } catch (err) {
        console.warn('Backend API offline or empty, clearing UI state.');
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Live Polling every 3 seconds for real-time WhatsApp & n8n activity updates
    const pollInterval = setInterval(async () => {
      try {
        const actRes = await fetch(`${API_URL}/api/activities`);
        if (actRes.ok) {
          const freshActs = await actRes.json();
          setActivities(freshActs);
        }
      } catch (e) { }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [refreshTrigger]);

  // Handler: Analyze single prospect with AI
  const handleAnalyzeProspect = async (prospect: Prospect) => {
    setActiveTab('ai-analyst');
    setAiForm({
      companyName: prospect.name,
      website: prospect.website || '',
      industry: prospect.industry || '',
      description: `Lead calificado en ${prospect.location || 'Localidad'}. Contacto: ${prospect.contactName || 'No especificado'}. Teléfono: ${prospect.phone || 'No especificado'}.`
    });

    // Auto-trigger scoring execution for UI flow
    setAiAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/api/ai-analyst/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: prospect.name,
          website: prospect.website || '',
          industry: prospect.industry || '',
          prospectId: prospect.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        setRefreshTrigger(prev => prev + 1);
      } else {
        // Fallback mock AI generation locally
        setTimeout(() => {
          const fakeScore = Math.floor(65 + Math.random() * 30);
          setAiResult({
            score: fakeScore,
            level: fakeScore >= 85 ? 'Critical' : 'High',
            detectedProblem: `Tiene un sitio web funcional pero carece de un sistema de cotización y captación por chat automatizado en tiempo real.`,
            recommendedSolution: `Instalar un widget de WhatsApp LeadForge conectado a un agente IA tipo VENDEDOR para captar presupuestos las 24 horas.`,
            purchaseProbability: `${fakeScore - 8}%`,
            suggestedMessage: `Hola equipo de ${prospect.name},\n\nRevisé su sitio web y noté que los clientes que los visitan fuera de horario no tienen forma de cotizar al instante. ¿Les interesaría conectar un Agente Inteligente a su WhatsApp para automatizar esto?\n\nQuedo atento.`
          });
          // Update local prospect score
          setProspects(prev => prev.map(p => p.id === prospect.id ? { ...p, score: fakeScore, lastActivity: new Date().toISOString() } : p));
        }, 1000);
      }
    } catch (e) {
      // Offline fallback
      setTimeout(() => {
        const fakeScore = Math.floor(65 + Math.random() * 30);
        setAiResult({
          score: fakeScore,
          level: fakeScore >= 85 ? 'Critical' : 'High',
          detectedProblem: `El cliente potencial carece de agentes automatizados para atender consultas en fines de semana.`,
          recommendedSolution: `Conectar Evolution API con LeadForge AI para responder dudas recurrentes automáticamente.`,
          purchaseProbability: `${fakeScore - 10}%`,
          suggestedMessage: `Hola,\n\nRevisé su sitio de ${prospect.name} y me pareció excelente. ¿Tienen agentes atendiendo en fin de semana? Podemos automatizar su atención.`
        });
        setProspects(prev => prev.map(p => p.id === prospect.id ? { ...p, score: fakeScore, lastActivity: new Date().toISOString() } : p));
      }, 1000);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Handler: Manual analyze opportunity scorer
  const handleAnalyzeScorer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiForm.companyName) return;
    setAiAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/api/ai-analyst/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm)
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
      } else {
        throw new Error('API offline');
      }
    } catch (e) {
      setTimeout(() => {
        const score = Math.floor(45 + Math.random() * 50);
        setAiResult({
          score,
          level: score >= 85 ? 'Critical' : score >= 70 ? 'High' : 'Medium',
          detectedProblem: `El análisis de ${aiForm.companyName} indica canales digitales suboptimizados para captación directa.`,
          recommendedSolution: `Integrar un chatbot inteligente entrenado con el prompt del catálogo de la empresa.`,
          purchaseProbability: `${score - 5}%`,
          suggestedMessage: `Hola equipo de ${aiForm.companyName},\n\nEstuvimos revisando su perfil comercial y encontramos oportunidades de mejora en la atención de leads por chat.\n\n¿Agendamos una breve llamada?\n\nSaludos.`
        });
      }, 800);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Handler: Manual add lead
  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProspect)
      });
      if (res.ok) {
        const data = await res.json();
        setProspects(prev => [data, ...prev]);
        setShowAddProspectModal(false);
        setNewProspect({ name: '', contactName: '', phone: '', email: '', website: '', industry: '', location: '', status: 'NEW' });
      } else {
        throw new Error();
      }
    } catch (e) {
      // Mock insert locally
      const mockLead: Prospect = {
        id: 'lead-' + Math.random().toString(36).substring(7),
        companyId: 'c1',
        name: newProspect.name,
        contactName: newProspect.contactName,
        phone: newProspect.phone,
        email: newProspect.email,
        website: newProspect.website,
        industry: newProspect.industry,
        location: newProspect.location,
        score: 0,
        status: newProspect.status,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      setProspects(prev => [mockLead, ...prev]);
      setShowAddProspectModal(false);
      setNewProspect({ name: '', contactName: '', phone: '', email: '', website: '', industry: '', location: '', status: 'NEW' });
    }
  };

  // Handler: Delete single prospect
  const handleDeleteProspect = async (id: string) => {
    setProspects(prev => prev.filter(p => p.id !== id));
    try {
      await fetch(`${API_URL}/api/prospects/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Failed to delete prospect on backend:', e);
    }
  };

  // Handler: Clear all fake mock prospects (+52 55... numbers or clinicasbarranquilla/barberias)
  const handleClearFakeProspects = async () => {
    const fakes = prospects.filter(p =>
      !p.phone ||
      p.phone.includes('+52 55 9988') ||
      p.phone.includes('+52 55 1234') ||
      p.phone.includes('+52 55 8765') ||
      p.name.toLowerCase().includes('barberias') ||
      p.name.toLowerCase().includes('clinicasbarranquilla') ||
      p.name.toLowerCase().includes('celinicas')
    );

    fakes.forEach(f => handleDeleteProspect(f.id));
    setProspects(prev => prev.filter(p => !fakes.some(f => f.id === p.id)));
  };

  // Handler: Run Apify Scrape lead workflow (REAL LIVE EXTRACTION & N8N WEBHOOK TRIGGER)
  const handleRunScraper = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowScrapeModal(false);

    // Trigger n8n Workflow on Hostinger VPS in parallel
    try {
      fetch('https://n8n-cafl.srv1720387.hstgr.cloud/webhook/prospeccion-autonoma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: scrapeQuery.query, limit: scrapeQuery.limit || 5 })
      }).catch(e => console.log('n8n Webhook trigger:', e));
    } catch (err) { }

    try {
      const res = await fetch(`${API_URL}/api/prospects/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapeQuery)
      });
      if (res.ok) {
        await res.json();
        setRefreshTrigger(prev => prev + 1);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Direct live Apify client-side call if backend is standalone
    }

    // Direct Live Apify Google Places Extraction
    try {
      const apifyRes = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${(import.meta as any).env?.VITE_APIFY_TOKEN || ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [scrapeQuery.query],
          maxCrawledPlacesPerSearch: scrapeQuery.limit || 5,
          language: 'es'
        })
      });

      if (apifyRes.ok) {
        const items = await apifyRes.json();
        if (Array.isArray(items) && items.length > 0) {
          const liveLeads: Prospect[] = items.map((item: any, idx: number) => {
            const score = Math.floor(70 + Math.random() * 25);
            return {
              id: 'apify-live-' + Date.now() + '-' + idx,
              companyId: 'c1',
              name: item.title || item.name || scrapeQuery.query,
              contactName: null,
              phone: item.phoneUnformatted || item.phone || undefined,
              email: item.email || undefined,
              website: item.website || undefined,
              industry: item.categoryName || scrapeQuery.query,
              location: item.city || item.address || item.location || 'Colombia',
              score,
              status: 'NEW',
              lastActivity: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
          });

          setProspects(prev => [...liveLeads, ...prev]);
          setActivities(prev => [
            {
              id: 'act-' + Math.random().toString(36).substring(7),
              companyId: 'c1',
              type: 'LEAD_CREATED',
              description: `Apify finalizó la extracción REAL de "${scrapeQuery.query}". Se agregaron ${liveLeads.length} leads reales de Google Maps.`,
              createdAt: new Date().toISOString()
            },
            ...prev
          ]);
        }
      }
    } catch (err) {
      console.error('Direct Apify extraction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Add Whatsapp Session instance
  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceName) return;
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newInstanceName })
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappInstances(prev => [...prev, data]);
        setShowAddInstanceModal(false);
        setNewInstanceName('');
      } else {
        throw new Error();
      }
    } catch (e) {
      const mockInst: WhatsappInstance = {
        id: 'wa-' + Math.random().toString(36).substring(7),
        companyId: 'c1',
        name: newInstanceName,
        phone: null,
        status: 'DISCONNECTED',
        createdAt: new Date().toISOString()
      };
      setWhatsappInstances(prev => [...prev, mockInst]);
      setShowAddInstanceModal(false);
      setNewInstanceName('');
    }
  };

  // Handler: Generate Evolution API QR
  const handleShowQR = async (instance: WhatsappInstance) => {
    setQrCodeModal({ open: true, instanceId: instance.id, qrCodeUrl: null, loading: true });
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/instances/${instance.id}/qr`);
      if (res.ok) {
        const data = await res.json();
        setQrCodeModal({ open: true, instanceId: instance.id, qrCodeUrl: data.qrCode || null, loading: false });
      } else {
        throw new Error();
      }
    } catch (e) {
      setQrCodeModal({
        open: true,
        instanceId: instance.id,
        qrCodeUrl: null,
        loading: false
      });
    }
  };

  // Live polling while QR code modal is open to auto-detect WhatsApp linkage!
  const [connectionSuccessMsg, setConnectionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!qrCodeModal || !qrCodeModal.open || !qrCodeModal.instanceId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/whatsapp/instances`);
        if (res.ok) {
          const list: WhatsappInstance[] = await res.json();
          const target = list.find(w => w.id === qrCodeModal.instanceId || w.name.toLowerCase() === qrCodeModal.instanceId.toLowerCase());
          if (target && target.status === 'CONNECTED') {
            setConnectionSuccessMsg(target.phone || 'Número vinculado');
            try { cyberAudio.playSuccess(); } catch (e) { }
            setTimeout(() => {
              setQrCodeModal(null);
              setConnectionSuccessMsg(null);
              setRefreshTrigger(prev => prev + 1);
            }, 1800);
          }
        }
      } catch (e) { }
    }, 2000);

    return () => clearInterval(interval);
  }, [qrCodeModal?.open, qrCodeModal?.instanceId]);

  // Handler: Validate QR Code read (connect mock instance)
  const handleValidateQR = async (instanceId: string) => {
    setConnectionSuccessMsg('+57 302 203 4253');
    try { cyberAudio.playSuccess(); } catch (e) { }
    try {
      await fetch(`${API_URL}/api/whatsapp/instances/${instanceId}/connect-mock`, {
        method: 'POST'
      });
    } catch (e) { }
    setWhatsappInstances(prev => prev.map(w => w.id === instanceId ? { ...w, status: 'CONNECTED', phone: '+57 302 203 4253', qrCode: null } : w));
    setTimeout(() => {
      setQrCodeModal(null);
      setConnectionSuccessMsg(null);
      setRefreshTrigger(prev => prev + 1);
    }, 1800);
  };

  // Handler: Disconnect instance
  const handleDisconnectInstance = async (instanceId: string) => {
    try {
      await fetch(`${API_URL}/api/whatsapp/instances/${instanceId}/disconnect`, {
        method: 'POST'
      });
    } catch (e) {
      console.warn('Error disconnecting instance:', e);
    }
    setWhatsappInstances(prev => prev.map(w => w.id === instanceId ? { ...w, status: 'DISCONNECTED', phone: null } : w));
  };

  // Handler: Delete WhatsApp Session instance
  const handleDeleteInstance = async (instanceId: string) => {
    try {
      await fetch(`${API_URL}/api/whatsapp/instances/${instanceId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Error deleting instance:', e);
    }
    setWhatsappInstances(prev => prev.filter(w => w.id !== instanceId));
  };

  // Handler: Create Agent config
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(prev => [...prev, data]);
        setShowAddAgentModal(false);
        setNewAgent({ name: '', type: 'SALES', color: '#06B6D4', prompt: '', objective: '', schedule: '09:00 - 18:00', whatsappInstanceId: '', n8nWebhookUrl: '', status: 'ACTIVE' });
        if (data && data.id) {
          navigator.clipboard.writeText(`id=eq.${data.id}`);
          setCopiedAgentId(data.id);
          setTimeout(() => setCopiedAgentId(null), 3000);
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      const createdId = 'ag-' + Math.random().toString(36).substring(7);
      const mockAg: Agent = {
        id: createdId,
        companyId: 'c1',
        whatsappInstanceId: newAgent.whatsappInstanceId || null,
        name: newAgent.name,
        type: newAgent.type,
        prompt: newAgent.prompt,
        objective: newAgent.objective,
        schedule: newAgent.schedule,
        status: newAgent.status,
        createdAt: new Date().toISOString()
      };
      setAgents(prev => [...prev, mockAg]);
      setShowAddAgentModal(false);
      setNewAgent({ name: '', type: 'SALES', color: '#06B6D4', prompt: '', objective: '', schedule: '09:00 - 18:00', whatsappInstanceId: '', n8nWebhookUrl: '', status: 'ACTIVE' });
      navigator.clipboard.writeText(`id=eq.${createdId}`);
      setCopiedAgentId(createdId);
      setTimeout(() => setCopiedAgentId(null), 3000);
    }
  };

  // Handler: Toggle Agent state with backend persistence
  const handleToggleAgent = async (agentId: string) => {
    const targetAgent = agents.find(a => a.id === agentId);
    if (!targetAgent) return;
    const newStatus = targetAgent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // Optimistic UI update
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: newStatus } : a));

    try {
      await fetch(`${API_URL}/api/agents/${agentId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error('Error al guardar estado de agente:', e);
    }
  };

  // Handler: Register or Update Workflow (n8n Webhook)
  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkflow)
      });
      if (res.ok) {
        setShowAddWorkflowModal(false);
        setNewWorkflow({ id: '', name: '', type: 'WHATSAPP', n8nWebhookUrl: '', status: 'ACTIVE' });
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
      const existingIdx = workflows.findIndex(w => w.id === newWorkflow.id);
      const payload = {
        id: newWorkflow.id || 'wf-' + Math.random().toString(36).substring(7),
        companyId: 'company-default-123',
        name: newWorkflow.name,
        type: newWorkflow.type as any,
        status: newWorkflow.status as any,
        n8nWebhookUrl: newWorkflow.n8nWebhookUrl,
        lastRun: null,
        nextRun: null,
        createdAt: new Date().toISOString()
      };
      if (existingIdx !== -1) {
        setWorkflows(prev => prev.map((w, idx) => idx === existingIdx ? payload : w));
      } else {
        setWorkflows(prev => [...prev, payload]);
      }
      setShowAddWorkflowModal(false);
      setNewWorkflow({ id: '', name: '', type: 'WHATSAPP', n8nWebhookUrl: '', status: 'ACTIVE' });
    }
  };

  // Handler: Trigger n8n manual workflow runs with Live Connection Feedback
  const handleTriggerWorkflow = async (workflowId: string) => {
    setWorkflowTestResult(null);
    try {
      const res = await fetch(`${API_URL}/api/workflows/${workflowId}/trigger`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        const success = data.status === 'SUCCESS';
        setWorkflowTestResult({
          id: workflowId,
          success,
          msg: success
            ? `🟢 ¡Conexión Validada! n8n respondió exitosamente en ${data.durationMs || 300}ms (HTTP 200 OK).`
            : `🔴 Error al contactar n8n: ${data.error || 'No se pudo contactar el Webhook.'}`
        });
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (e: any) {
      setWorkflowTestResult({
        id: workflowId,
        success: false,
        msg: `🔴 Error de red: Asegúrate de que el servidor de n8n esté activo.`
      });
    }
  };

  // Handler: Delete Agent from DB
  const handleDeleteAgent = async (agentId: string) => {
    try {
      const targetAgent = agents.find(a => a.id === agentId);
      const res = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAgents(prev => prev.filter(a => a.id !== agentId));
        if (targetAgent) {
          setWorkflows(prev => prev.filter(w => !w.name.includes(targetAgent.name)));
        }
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
      setAgents(prev => prev.filter(a => a.id !== agentId));
    }
  };

  // Handler: Delete Workflow
  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/workflows/${workflowId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    }
  };

  // Copy Suggested Message
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filtered prospects list
  const filteredProspects = prospects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (p.contactName && p.contactName.toLowerCase().includes(filterQuery.toLowerCase())) ||
      (p.industry && p.industry.toLowerCase().includes(filterQuery.toLowerCase()));
    const matchesIndustry = filterIndustry === 'ALL' || p.industry === filterIndustry;
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchesSearch && matchesIndustry && matchesStatus;
  });

  // Get distinct list of industries for filtering
  const industriesList = Array.from(new Set(prospects.map(p => p.industry).filter((ind): ind is string => !!ind)));

  // Score badge helper
  const getScoreColorClass = (score: number) => {
    if (score >= 85) return 'border-leadforge-critical text-leadforge-critical bg-leadforge-critical/10';
    if (score >= 70) return 'border-leadforge-warning text-leadforge-warning bg-leadforge-warning/10';
    if (score >= 45) return 'border-leadforge-primary text-leadforge-primary bg-leadforge-primary/10';
    return 'border-leadforge-muted text-leadforge-muted bg-leadforge-muted/10';
  };

  if (!isAuthenticated) {
    return (
      <CinematicHQExperience
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setCurrentUser(user);
          localStorage.setItem('leadforge_auth', 'true');
          localStorage.setItem('leadforge_user', JSON.stringify(user));
        }}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0B1220] tech-grid-bg text-[#F8FAFC] flex font-sans overflow-hidden">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-leadforge-border bg-[#111827]/75 backdrop-blur-md flex flex-col justify-between z-10 flex-shrink-0 h-full">
        <div>
          {/* Logo Brand */}
          <div className="h-16 flex items-center px-6 border-b border-leadforge-border">
            <div className="flex items-center gap-2">
              <div className="bg-leadforge-primary/10 p-1.5 rounded-lg border border-leadforge-primary/20 shadow-glow-primary">
                <Zap className="h-5 w-5 text-leadforge-primary animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#F8FAFC] to-[#06B6D4] bg-clip-text text-transparent">LeadForge AI</span>
                <span className="block text-[9px] text-leadforge-primary uppercase font-bold tracking-widest mt-[-2px]">SaaS Engine</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2">
            {/* 1. DASHBOARD */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                }`}
            >
              <LayoutDashboard className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${activeTab === 'dashboard' ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:text-cyan-400'}`} />
              Dashboard
            </button>

            {/* 2. PROSPECTOS */}
            <button
              onClick={() => setActiveTab('prospects')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${activeTab === 'prospects'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                }`}
            >
              <Users className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${activeTab === 'prospects' ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:text-cyan-400'}`} />
              Prospectos
              {prospects.length > 0 && (
                <span className="ml-auto bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                  {prospects.length}
                </span>
              )}
            </button>

            {/* 3. AI ANALYST */}
            <button
              onClick={() => setActiveTab('ai-analyst')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${activeTab === 'ai-analyst'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                }`}
            >
              <BrainCircuit className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${activeTab === 'ai-analyst' ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:text-cyan-400'}`} />
              AI Analyst
            </button>

            {/* 4. CANALES & INTEGRACIONES */}
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${activeTab === 'whatsapp'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                }`}
            >
              <Radio className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${activeTab === 'whatsapp' ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:text-cyan-400'}`} />
              Canales & Integraciones
              {whatsappInstances.filter(w => w.status === 'CONNECTED').length > 0 && (
                <span className="ml-auto flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>

            {/* 5. AGENTES IA */}
            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${activeTab === 'agents'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                }`}
            >
              <Bot className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${activeTab === 'agents' ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:text-cyan-400'}`} />
              Agentes IA
              <span className="ml-auto flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
            </button>

            {/* 6. WORKFLOWS (N8N) */}
            <button
              onClick={() => setActiveTab('workflows')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${activeTab === 'workflows'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                }`}
            >
              <Cpu className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${activeTab === 'workflows' ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:text-cyan-400'}`} />
              Workflows (n8n)
            </button>

            {/* 7. CONFIGURACIÓN */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${activeTab === 'settings'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                }`}
            >
              <Settings className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${activeTab === 'settings' ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'group-hover:text-cyan-400'}`} />
              Configuración
            </button>
          </nav>
        </div>

        {/* Profile Card Foot */}
        <div className="p-4 border-t border-leadforge-border bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-leadforge-primary/10 border border-leadforge-primary/30 flex items-center justify-center font-bold text-leadforge-primary">
              G
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold text-[#F8FAFC] truncate">Gestiva Corp</span>
              <span className="block text-[10px] text-leadforge-secondary uppercase font-bold tracking-wider">Plan Business</span>
            </div>
            <button
              onClick={() => setRefreshTrigger(p => p + 1)}
              className="ml-auto p-1.5 rounded-lg text-leadforge-muted hover:text-leadforge-primary hover:bg-slate-800"
              title="Sincronizar Datos"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* TOP HEADER */}
        <header className="h-16 border-b border-leadforge-border bg-[#111827]/30 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#F8FAFC] capitalize tracking-wide">{activeTab.replace('-', ' ')}</h1>
            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-700">Environment: Sandbox</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                cyberAudio.playClick();
                setShowWhatsappSim(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold text-xs rounded-xl hover:bg-emerald-500/30 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              📱 Simular WhatsApp Live
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-xs rounded-xl hover:bg-cyan-500/30 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              title="Ver Entrada Cinematográfica 3D (Login)"
            >
              <Bot className="h-3.5 w-3.5" />
              🎬 Ver Entrada 3D
            </button>

            <div className="text-xs text-right hidden sm:block">
              <span className="text-slate-400 block">Workspace actual</span>
              <span className="text-[#F8FAFC] font-medium">Gestiva Principal</span>
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-leadforge-secondary shadow-glow-success" />
          </div>
        </header>

        {/* VIEWPORTS */}
        <div className="flex-1 overflow-y-auto p-8">

          {loading && (
            <div className="flex items-center justify-center min-h-[500px] w-full">
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl glass-panel border border-leadforge-primary/30 shadow-2xl text-center space-y-5 max-w-md relative overflow-hidden animate-scaleIn">
                {/* Background ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-leadforge-primary/10 via-transparent to-cyan-500/10 pointer-events-none" />

                {/* Animated Robot Constructing Headquarters */}
                <div className="relative flex items-center justify-center w-24 h-24">
                  {/* Pulsing Radar Ring */}
                  <span className="absolute inline-flex h-24 w-24 rounded-full bg-leadforge-primary/20 animate-ping opacity-40" />
                  <span className="absolute inline-flex h-20 w-20 rounded-full border border-leadforge-primary/40 animate-spin" style={{ animationDuration: '6s' }} />

                  {/* Central Robot Icon with bouncing & glowing antenna */}
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-[#060B14] border border-leadforge-primary/60 flex items-center justify-center shadow-glow-primary animate-bounce">
                    <Bot className="h-9 w-9 text-leadforge-primary drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                    <span className="absolute -top-1 right-2 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-glow-primary" />
                  </div>
                </div>

                {/* Creative Title & Status */}
                <div className="space-y-1.5 relative z-10">
                  <h3 className="text-base font-extrabold text-[#F8FAFC] tracking-wide flex items-center justify-center gap-2">
                    🏢 Construyendo Edificio Inteligente...
                  </h3>
                  <p className="text-xs text-leadforge-primary font-mono font-semibold animate-pulse">
                    ⚡ Ensamblando agentes y sincronizando n8n
                  </p>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden border border-leadforge-border/60 p-0.5">
                  <div className="bg-gradient-to-r from-leadforge-primary via-cyan-400 to-emerald-400 h-full rounded-full animate-pulse w-full transition-all duration-1000" />
                </div>

                <span className="text-[10px] text-slate-400 italic">Conectando red de automatización y motores de IA</span>
              </div>
            </div>
          )}

          {!loading && (
            <>
              {/* 1. DASHBOARD VIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fadeIn">

                  {/* HERO BANNER */}
                  <div className="relative glass-panel rounded-2xl p-6 border border-leadforge-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
                    <div className="absolute right-0 top-0 w-96 h-96 bg-leadforge-primary/5 rounded-full filter blur-3xl pointer-events-none mt-[-100px] mr-[-100px]" />
                    <div className="space-y-1">
                      <h2 className="text-2xl font-extrabold text-[#F8FAFC] flex items-center gap-2">
                        Bienvenido a LeadForge AI <Sparkles className="h-5 w-5 text-leadforge-primary fill-leadforge-primary/30" />
                      </h2>
                      <p className="text-sm text-leadforge-muted max-w-xl">
                        Plataforma inteligente de prospección. Detecta de forma proactiva clientes potenciales, califica su valor comercial e inicia flujos de WhatsApp automáticos.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400 font-mono shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span>🤖 Prospección Diaria Autónoma: <strong className="text-white font-sans">Activa (Rotación de Nichos)</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* KPI ROW CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="glass-panel p-4 rounded-xl border border-leadforge-border tech-card-hover flex flex-col justify-between">
                      <span className="text-xs text-leadforge-muted block font-medium">Leads Hoy</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-leadforge-primary">{kpis.leadsToday}</span>
                        <span className="text-[10px] text-leadforge-secondary font-bold font-mono">+12%</span>
                      </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl border border-leadforge-border tech-card-hover flex flex-col justify-between">
                      <span className="text-xs text-leadforge-muted block font-medium">Leads Semana</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#F8FAFC]">{kpis.leadsThisWeek}</span>
                        <span className="text-[10px] text-leadforge-secondary font-bold font-mono">+8%</span>
                      </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl border border-leadforge-border tech-card-hover flex flex-col justify-between">
                      <span className="text-xs text-leadforge-muted block font-medium">Calientes (Score &gt;80)</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-leadforge-critical">{kpis.hotOpportunities}</span>
                        <span className="text-[10px] text-leadforge-secondary font-bold font-mono">+24%</span>
                      </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl border border-leadforge-border tech-card-hover flex flex-col justify-between">
                      <span className="text-xs text-leadforge-muted block font-medium">Conversaciones</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#F8FAFC]">{kpis.conversationsActive}</span>
                        <span className="text-[10px] text-leadforge-secondary font-bold font-mono">+40%</span>
                      </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl border border-leadforge-border tech-card-hover flex flex-col justify-between">
                      <span className="text-xs text-leadforge-muted block font-medium">WhatsApp Link</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-leadforge-secondary">{kpis.whatsappConnected}</span>
                        <span className="text-[10px] text-slate-500 font-mono">conectado</span>
                      </div>
                    </div>

                    <div className="glass-panel p-4 rounded-xl border border-leadforge-border tech-card-hover flex flex-col justify-between">
                      <span className="text-xs text-leadforge-muted block font-medium">Agentes Activos</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-leadforge-warning">{kpis.agentsRunning}</span>
                        <span className="text-[10px] text-slate-500 font-mono">ejecutando</span>
                      </div>
                    </div>
                  </div>

                  {/* CHARTS CONTAINER SECTION */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Weekly Generation Activity */}
                    <div className="glass-panel p-6 rounded-xl border border-leadforge-border flex flex-col space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#F8FAFC]">Actividad Semanal</h3>
                        <p className="text-xs text-leadforge-muted">Leads identificados vs Mensajes enviados</p>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData.weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="day" stroke="#475569" fontSize={11} />
                            <YAxis stroke="#475569" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1E293B' }} />
                            <Area type="monotone" dataKey="leads" name="Leads" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                            <Area type="monotone" dataKey="messages" name="Mensajes WA" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorMsg)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Conversion Rates Funnel */}
                    <div className="glass-panel p-6 rounded-xl border border-leadforge-border flex flex-col space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#F8FAFC]">Embudo de Conversión</h3>
                        <p className="text-xs text-leadforge-muted">Evolución de leads a lo largo del proceso</p>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.conversionRates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="stage" stroke="#475569" fontSize={10} />
                            <YAxis stroke="#475569" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1E293B' }} />
                            <Bar dataKey="count" name="Volumen" radius={[4, 4, 0, 0]}>
                              {chartData.conversionRates.map((entry: any, index: number) => {
                                const colors = ['#38BDF8', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Lead Score Distribution */}
                    <div className="glass-panel p-6 rounded-xl border border-leadforge-border flex flex-col space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#F8FAFC]">Distribución de Score IA</h3>
                        <p className="text-xs text-leadforge-muted">Número de prospectos agrupados por calidad de oportunidad</p>
                      </div>
                      <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="range" stroke="#475569" fontSize={11} />
                            <YAxis stroke="#475569" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1E293B' }} />
                            <Bar dataKey="count" name="Prospectos" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Leads by source pie chart */}
                    <div className="glass-panel p-6 rounded-xl border border-leadforge-border flex flex-col space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-[#F8FAFC]">Leads por Fuente</h3>
                        <p className="text-xs text-leadforge-muted">Canales de adquisición de datos comerciales</p>
                      </div>
                      <div className="h-64 w-full flex items-center">
                        <div className="w-1/2 h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData.leadsBySource}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {chartData.leadsBySource.map((entry: any, index: number) => {
                                  const colors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1E293B' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-2">
                          {chartData.leadsBySource.map((item: any, idx: number) => {
                            const colors = ['bg-leadforge-primary', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
                            return (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                                <span className="text-slate-300">{item.name}:</span>
                                <span className="font-bold text-[#F8FAFC]">{item.value}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* BOTTOM ROW: RECENT ACTIVITIES LOGS */}
                  <div className="glass-panel p-6 rounded-xl border border-leadforge-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#F8FAFC]">Actividades de Prospección Recientes</h3>
                      <span className="text-[10px] text-leadforge-primary font-bold uppercase tracking-wider font-mono">Live Logs</span>
                    </div>
                    <div className="space-y-3">
                      {activities.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-leadforge-border/40 text-xs text-slate-300">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${act.type === 'LEAD_CREATED' ? 'bg-leadforge-primary shadow-glow-primary' :
                            act.type === 'LEAD_SCORED' ? 'bg-leadforge-warning' :
                              'bg-leadforge-secondary'
                            }`} />
                          <div className="flex-1">
                            <p className="font-medium text-[#F8FAFC]">{act.description}</p>
                            <span className="text-[10px] text-slate-500 font-mono block mt-1">{new Date(act.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* 2. PROSPECTS VIEW */}
              {activeTab === 'prospects' && (
                <div className="space-y-6 animate-fadeIn">

                  {/* FILTERS & SEARCH ROW */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#111827]/40 p-4 rounded-xl border border-leadforge-border">
                    <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">

                      {/* Search box */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-leadforge-muted" />
                        <input
                          type="text"
                          placeholder="Buscar empresa, contacto o sector..."
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs focus:border-leadforge-primary focus:outline-none transition-all"
                        />
                      </div>

                      {/* Industry filter */}
                      <div className="flex gap-2">
                        <select
                          value={filterIndustry}
                          onChange={(e) => setFilterIndustry(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs focus:outline-none text-slate-300"
                        >
                          <option value="ALL">Todos los Sectores</option>
                          {industriesList.map((ind, i) => (
                            <option key={i} value={ind}>{ind}</option>
                          ))}
                        </select>

                        {/* Status filter */}
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs focus:outline-none text-slate-300"
                        >
                          <option value="ALL">Todos los Estados</option>
                          <option value="NEW">Nuevo</option>
                          <option value="CONTACTED">Contactado</option>
                          <option value="QUALIFIED">Calificado</option>
                          <option value="UNQUALIFIED">No Calificado</option>
                        </select>
                      </div>

                    </div>

                    <div className="flex gap-3 w-full md:w-auto justify-end">
                      {prospects.some(p => p.phone?.includes('+52 55') || p.name.toLowerCase().includes('barberias') || p.name.toLowerCase().includes('clinicas')) && (
                        <button
                          onClick={handleClearFakeProspects}
                          className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                          title="Limpiar Prospectos Falsos o de Prueba"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          Limpiar Falsos
                        </button>
                      )}
                      <button
                        onClick={() => setShowScrapeModal(true)}
                        className="px-3 py-2 bg-slate-900 border border-leadforge-border text-slate-300 hover:text-leadforge-primary hover:border-leadforge-primary rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Buscar Maps (Apify)
                      </button>
                      <button
                        onClick={() => setShowAddProspectModal(true)}
                        className="px-3 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded-lg text-xs hover:shadow-glow-primary transition-all flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                        Agregar Lead
                      </button>
                    </div>
                  </div>

                  {/* PROSPECTS GRID TABLE */}
                  <div className="glass-panel rounded-xl border border-leadforge-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-leadforge-border bg-slate-900/30 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            <th className="py-3.5 px-6">Empresa / Sitio Web</th>
                            <th className="py-3.5 px-6">Contacto</th>
                            <th className="py-3.5 px-6">Contacto Canales</th>
                            <th className="py-3.5 px-6">Sector & Ubicación</th>
                            <th className="py-3.5 px-6 text-center">Score IA</th>
                            <th className="py-3.5 px-6">Estado</th>
                            <th className="py-3.5 px-6 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-leadforge-border/40 text-xs">
                          {filteredProspects.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                                <Users className="h-8 w-8 mx-auto mb-2 text-slate-600 stroke-[1.5]" />
                                No se encontraron prospectos con los filtros actuales.
                              </td>
                            </tr>
                          ) : (
                            filteredProspects.map((prospect) => (
                              <tr key={prospect.id} className="hover:bg-slate-900/20 transition-all">
                                <td className="py-4 px-6">
                                  <span className="font-bold text-[#F8FAFC] block">{prospect.name}</span>
                                  {prospect.website ? (
                                    <a
                                      href={prospect.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-leadforge-primary hover:underline flex items-center gap-1 text-[10px] mt-0.5"
                                    >
                                      <Globe className="h-2.5 w-2.5" />
                                      {prospect.website.replace(/https?:\/\/(www\.)?/, '')}
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 block">Sitio no especificado</span>
                                  )}
                                </td>

                                <td className="py-4 px-6 text-slate-300">
                                  {prospect.contactName ? (
                                    <span>{prospect.contactName}</span>
                                  ) : (
                                    <span className="text-slate-500 font-light italic">Sin contacto</span>
                                  )}
                                </td>

                                <td className="py-4 px-6 space-y-0.5">
                                  {prospect.phone && (
                                    <span className="text-slate-300 text-[10px] block flex items-center gap-1">
                                      <Phone className="h-2.5 w-2.5 text-leadforge-secondary" />
                                      {prospect.phone}
                                    </span>
                                  )}
                                  {prospect.email && (
                                    <span className="text-slate-400 text-[10px] block flex items-center gap-1">
                                      <Mail className="h-2.5 w-2.5 text-slate-400" />
                                      {prospect.email}
                                    </span>
                                  )}
                                </td>

                                <td className="py-4 px-6">
                                  <span className="text-slate-300 block">{prospect.industry || 'No especificado'}</span>
                                  <span className="text-[10px] text-slate-500 block flex items-center gap-0.5 mt-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {prospect.location || 'Local desconocido'}
                                  </span>
                                </td>

                                <td className="py-4 px-6 text-center">
                                  {prospect.score > 0 ? (
                                    <span className={`inline-block border font-bold font-mono text-[10px] px-2 py-1 rounded-full ${getScoreColorClass(prospect.score)}`}>
                                      {prospect.score} / 100
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">No calificado</span>
                                  )}
                                </td>

                                <td className="py-4 px-6">
                                  <span className={`inline-block text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${prospect.status === 'QUALIFIED' ? 'bg-leadforge-secondary/20 text-leadforge-secondary border border-leadforge-secondary/30' :
                                    prospect.status === 'NEW' ? 'bg-leadforge-primary/20 text-leadforge-primary border border-leadforge-primary/30' :
                                      prospect.status === 'CONTACTED' ? 'bg-leadforge-warning/20 text-leadforge-warning border border-leadforge-warning/30' :
                                        'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}>
                                    {prospect.status}
                                  </span>
                                </td>

                                <td className="py-4 px-6 text-right space-x-2">
                                  <button
                                    onClick={() => handleAnalyzeProspect(prospect)}
                                    className="px-2.5 py-1 bg-slate-900 border border-leadforge-border text-slate-300 hover:text-leadforge-primary hover:border-leadforge-primary rounded text-[10px] font-semibold transition-all inline-flex items-center gap-1"
                                    title="Calificar con IA"
                                  >
                                    <BrainCircuit className="h-3 w-3" />
                                    AI Analyst
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProspect(prospect.id)}
                                    className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 rounded transition-all inline-flex items-center"
                                    title="Eliminar Prospecto"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* 3. AI ANALYST VIEW */}
              {activeTab === 'ai-analyst' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">

                  {/* Left Column: Form Parameters */}
                  <div className="lg:col-span-1 glass-panel p-6 rounded-xl border border-leadforge-border space-y-5 h-fit">
                    <div>
                      <h3 className="text-sm font-bold text-[#F8FAFC]">AI Opportunity Scorer</h3>
                      <p className="text-xs text-leadforge-muted">Analiza canales digitales y sugiere campañas optimizadas</p>
                    </div>

                    <form onSubmit={handleAnalyzeScorer} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Empresa</label>
                        <input
                          type="text"
                          required
                          value={aiForm.companyName}
                          onChange={(e) => setAiForm({ ...aiForm, companyName: e.target.value })}
                          placeholder="Nombre comercial..."
                          className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs focus:border-leadforge-primary focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Página Web</label>
                        <input
                          type="text"
                          value={aiForm.website}
                          onChange={(e) => setAiForm({ ...aiForm, website: e.target.value })}
                          placeholder="https://example.com"
                          className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs focus:border-leadforge-primary focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Sector</label>
                        <input
                          type="text"
                          value={aiForm.industry}
                          onChange={(e) => setAiForm({ ...aiForm, industry: e.target.value })}
                          placeholder="Ej. Clínicas Dentales, Consultoras..."
                          className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs focus:border-leadforge-primary focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Descripción / Contexto</label>
                        <textarea
                          rows={3}
                          value={aiForm.description}
                          onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })}
                          placeholder="Notas adicionales o problemas detectados..."
                          className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs focus:border-leadforge-primary focus:outline-none transition-all resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={aiAnalyzing}
                        className="w-full py-2.5 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold text-xs rounded-lg hover:shadow-glow-primary transition-all flex items-center justify-center gap-2"
                      >
                        {aiAnalyzing ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Calificando con IA...
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="h-4 w-4" />
                            Analizar Oportunidad
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: AI Score Results */}
                  <div className="lg:col-span-2 space-y-6">
                    {aiResult ? (
                      <div className="glass-panel p-6 rounded-xl border border-leadforge-border space-y-6 relative overflow-hidden animate-fadeIn">

                        {/* Decorative neon glow */}
                        <div className="absolute right-0 top-0 w-64 h-64 bg-leadforge-primary/10 rounded-full filter blur-3xl pointer-events-none mt-[-50px] mr-[-50px]" />

                        {/* Top Summary Card */}
                        <div className="flex items-center justify-between border-b border-leadforge-border/40 pb-4">
                          <div>
                            <h4 className="text-lg font-bold text-[#F8FAFC]">Resultados de Inteligencia Artificial</h4>
                            <span className="text-[10px] text-slate-500 font-mono">Modelo Utilizado: GPT-4.0 Strategic Classifier</span>
                          </div>

                          <div className="text-right">
                            <span className={`inline-block border font-bold font-mono text-xs px-3 py-1.5 rounded-full ${getScoreColorClass(aiResult.score)} shadow-glow-primary`}>
                              Score: {aiResult.score} / 100
                            </span>
                          </div>
                        </div>

                        {/* Main Grid Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-900/40 p-4 rounded-xl border border-leadforge-border/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Nivel de Prioridad</span>
                            <span className={`text-base font-extrabold block mt-1 ${aiResult.level === 'Critical' ? 'text-leadforge-critical' :
                              aiResult.level === 'High' ? 'text-leadforge-warning' :
                                'text-leadforge-primary'
                              }`}>
                              ⚡ Oportunidad {aiResult.level}
                            </span>
                          </div>

                          <div className="bg-slate-900/40 p-4 rounded-xl border border-leadforge-border/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Probabilidad de Cierre</span>
                            <span className="text-base font-extrabold text-leadforge-secondary block mt-1">
                              🤝 {aiResult.purchaseProbability} estimado
                            </span>
                          </div>
                        </div>

                        {/* Detail text boxes */}
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Problema Comercial Detectado:</h5>
                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/30 p-3 rounded-lg border border-leadforge-border/30">
                              {aiResult.detectedProblem}
                            </p>
                          </div>

                          <div>
                            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Solución Recomendada:</h5>
                            <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/30 p-3 rounded-lg border border-leadforge-border/30">
                              {aiResult.recommendedSolution}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Plantilla de WhatsApp Sugerida:</h5>
                              <button
                                onClick={() => handleCopyMessage(aiResult.suggestedMessage)}
                                className="text-xs text-leadforge-primary hover:text-[#F8FAFC] flex items-center gap-1.5"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="h-3 w-3 text-leadforge-secondary" />
                                    <span className="text-leadforge-secondary">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copiar Mensaje</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed bg-[#0B1220] p-4 rounded-lg border border-leadforge-border overflow-x-auto whitespace-pre-wrap">
                              {aiResult.suggestedMessage}
                            </pre>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="glass-panel p-12 rounded-xl border border-leadforge-border flex flex-col items-center justify-center text-center h-full">
                        <BrainCircuit className="h-12 w-12 text-slate-600 mb-4 stroke-[1.2]" />
                        <h4 className="font-bold text-slate-300">Esperando Oportunidad</h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                          Ingresa los datos de una empresa en el panel lateral y da click en Analizar para evaluar el Lead con IA.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* 4. CANALES & INTEGRACIONES API VIEW */}
              {activeTab === 'whatsapp' && (
                <div className="space-y-8 animate-fadeIn">

                  {/* Headline Header */}
                  <div className="flex justify-between items-center bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent p-5 rounded-2xl border border-leadforge-border/40 backdrop-blur-md">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <Radio className="h-6 w-6 text-cyan-400 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
                          Canales de Comunicación & Instancias API
                          <span className="px-2 py-0.5 text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full font-bold uppercase">Multicanal Live</span>
                        </h3>
                        <p className="text-xs text-leadforge-muted mt-0.5">Administra las sesiones de WhatsApp, Telegram, Webhooks y Apps conectadas a tus Agentes de IA.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddInstanceModal(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-leadforge-primary via-cyan-500 to-teal-400 text-slate-950 font-extrabold rounded-xl text-xs hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4 stroke-[3]" />
                      + Nueva Sesión / Canal
                    </button>
                  </div>

                  {/* INSTANCES GRID WITH ANIMATED LIGHTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {whatsappInstances.map((instance) => {
                      const isConnected = instance.status === 'CONNECTED';
                      return (
                        <div
                          key={instance.id}
                          className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between space-y-3.5 group ${isConnected
                            ? 'bg-gradient-to-b from-slate-900/90 via-[#0D1527] to-slate-950/90 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-emerald-400/70 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                            : 'bg-gradient-to-b from-slate-900/90 via-[#0D1527] to-slate-950/90 border-slate-800 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                            }`}
                        >
                          {/* Animated Top Ambient Light Bar */}
                          <div
                            className={`absolute top-0 left-0 right-0 h-0.5 ${isConnected
                              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse'
                              : 'bg-gradient-to-r from-rose-500/50 via-amber-500/50 to-slate-700'
                              }`}
                          />

                          {/* Header */}
                          <div className="flex items-start justify-between relative z-10 pt-0.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`p-2 rounded-lg border ${isConnected
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
                                  }`}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block font-mono">
                                  ID: {instance.id}
                                </span>
                                <h4 className="font-extrabold text-sm text-[#F8FAFC] group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                                  {instance.name}
                                </h4>
                              </div>
                            </div>

                            {/* Status Badge with Live Radar Pulse */}
                            <span
                              className={`inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border shadow-sm ${isConnected
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                                }`}
                            >
                              <span className="flex h-1.5 w-1.5 relative">
                                <span
                                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'
                                    }`}
                                />
                                <span
                                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                />
                              </span>
                              {instance.status}
                            </span>
                          </div>

                          {/* Information Card Content */}
                          <div className="bg-[#0B1220]/80 p-3 rounded-lg border border-slate-800/80 text-[11px] space-y-2 relative z-10 backdrop-blur-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                                <Radio className="h-3 w-3 text-cyan-400" />
                                Medio de Conexión:
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                {instance.name.toLowerCase().includes('telegram')
                                  ? 'Telegram Bot'
                                  : instance.name.toLowerCase().includes('voice') || instance.name.toLowerCase().includes('voz')
                                    ? 'Voz IP'
                                    : instance.name.toLowerCase().includes('webhook')
                                      ? 'n8n Webhook'
                                      : 'WhatsApp Web'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                                <Phone className="h-3 w-3 text-cyan-400" />
                                Identificador:
                              </span>
                              <span className="text-[#F8FAFC] font-extrabold font-mono text-[11px] tracking-wide bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800">
                                {instance.phone || 'Sin número'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                                <ActivityIcon className="h-3 w-3 text-emerald-400" />
                                Enlace:
                              </span>
                              <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                                {isConnected ? (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                    100% Online
                                  </>
                                ) : (
                                  <span className="text-amber-400">Requiere QR</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 relative z-10">
                            {isConnected ? (
                              <button
                                onClick={() => handleDisconnectInstance(instance.id)}
                                className="flex-1 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/50 hover:text-rose-400 rounded-lg text-[11px] font-bold transition-all shadow-sm"
                              >
                                Desconectar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleShowQR(instance)}
                                className="flex-1 py-1.5 bg-gradient-to-r from-leadforge-primary/20 via-cyan-500/20 to-teal-400/20 border border-cyan-500/40 text-cyan-300 hover:text-slate-950 hover:from-leadforge-primary hover:to-cyan-400 rounded-lg text-[11px] font-extrabold transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] flex items-center justify-center gap-1.5"
                              >
                                <QrCodeModalTrigger className="h-3.5 w-3.5 stroke-[2.5]" />
                                Ver Código QR
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteInstance(instance.id)}
                              title="Eliminar esta sesión de canal"
                              className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

              {/* 5. AGENTS VIEW */}
              {activeTab === 'agents' && (
                <div className="space-y-8 animate-fadeIn">

                  {/* TOP: AGENT CONTROL CARDS WITH ANIMATED ROBOTS */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                        <Bot className="h-4 w-4 text-leadforge-primary" />
                        Panel de Control de Agentes & Webhooks
                      </h4>
                      <span className="text-[10px] text-leadforge-primary font-bold uppercase font-mono">Live Control</span>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {agents.map((agent) => {
                        const isActive = agent.status === 'ACTIVE';
                        const customColor = (agent as any).color || (
                          agent.type === 'SALES' ? '#06B6D4' :
                            agent.type === 'SUPPORT' ? '#10B981' :
                              agent.type === 'BOOKING' ? '#F59E0B' : '#8B5CF6'
                        );
                        const robotAnim = agent.type === 'SALES' ? 'animate-robot-walk' :
                          agent.type === 'SUPPORT' ? 'animate-robot-type' :
                            agent.type === 'BOOKING' ? 'animate-robot-scan' :
                              'animate-robot-wave';
                        const roleLabel = agent.type === 'SALES' ? '💼 Ventas' :
                          agent.type === 'SUPPORT' ? '🛠️ Soporte' :
                            agent.type === 'BOOKING' ? '📅 Reservas' :
                              '🎯 Captador';

                        return (
                          <div
                            key={agent.id}
                            style={isActive ? ({
                              '--agent-glow': `${customColor}40`,
                              '--agent-glow-strong': `${customColor}90`,
                              borderColor: `${customColor}90`
                            } as React.CSSProperties) : {}}
                            className={`glass-panel p-2.5 rounded-2xl border flex flex-col items-center text-center justify-between w-44 h-44 relative overflow-hidden transition-all duration-300 flex-shrink-0 group ${isActive
                              ? 'bg-[#0A101D]/90 animate-card-neon-active hover:scale-[1.04]'
                              : 'border-slate-800/80 bg-[#0A101D]/50 opacity-65 hover:opacity-95 hover:scale-[1.02] hover:border-slate-700'
                              }`}
                          >
                            {/* Ambient background glow gradient */}
                            {isActive && (
                              <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full blur-xl pointer-events-none" style={{ backgroundColor: `${customColor}25` }} />
                            )}

                            {/* Header: Name + Active Ping Dot + Role Badge */}
                            <div className="w-full flex items-center justify-between gap-1 z-10">
                              <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                                {isActive ? (
                                  <span className="relative flex h-2 w-2 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: customColor }} />
                                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: customColor }} />
                                  </span>
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                                )}
                                <div className="truncate text-left">
                                  <h4 className="font-bold text-[11px] text-[#F8FAFC] truncate" title={agent.name}>
                                    {agent.name}
                                  </h4>
                                  <button
                                    onClick={(e) => handleCopyAgentId(agent.id, e)}
                                    className={`text-[8px] font-mono flex items-center gap-1 transition-all rounded px-1 py-0.5 border ${copiedAgentId === agent.id
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                      : 'bg-slate-900/80 text-cyan-400 border-cyan-500/30 hover:border-cyan-400 hover:text-white'
                                      }`}
                                    title="Haz clic para copiar 'id=eq.ID' para n8n"
                                  >
                                    {copiedAgentId === agent.id ? (
                                      <>
                                        <Check className="h-2.5 w-2.5 text-emerald-400" />
                                        <span>✓ Copiado n8n</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-2.5 w-2.5" />
                                        <span>ID: {agent.id}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              <span
                                style={{ color: customColor, borderColor: `${customColor}40`, backgroundColor: `${customColor}15` }}
                                className="text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md border font-mono"
                              >
                                {roleLabel}
                              </span>
                            </div>

                            {/* Futuristic Cyber Arena Box */}
                            <div className="w-full h-[84px] rounded-xl bg-[#050A14] border border-slate-800/80 flex items-center justify-center relative overflow-hidden my-1 transition-all" style={isActive ? { borderColor: `${customColor}40` } : {}}>

                              {/* Animated Cyber Grid Overlay */}
                              <div className="absolute inset-0 tech-grid-bg animate-grid-drift opacity-30 pointer-events-none" />

                              {/* Laser Scanner Beam (Active mode) */}
                              {isActive && (
                                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser-scan z-10 shadow-[0_0_8px_#06b6d4]" />
                              )}

                              {/* Sonar Radar Waves (Active mode) */}
                              {isActive && (
                                <>
                                  <div className="absolute w-12 h-12 rounded-full border animate-sonar-pulse pointer-events-none" style={{ borderColor: `${customColor}40` }} />
                                  <div className="absolute w-12 h-12 rounded-full border animate-sonar-pulse-delayed pointer-events-none" style={{ borderColor: `${customColor}25` }} />
                                </>
                              )}

                              {/* Data stream particles floating */}
                              {isActive && (
                                <>
                                  <span className="absolute top-1 left-0 text-[7px] font-mono animate-data-particle pointer-events-none" style={{ color: customColor }}>01101</span>
                                  <span className="absolute bottom-4 left-0 text-[7px] font-mono text-cyan-400/70 animate-data-particle-delay pointer-events-none">AI_RUN</span>
                                  <span className="absolute top-2 right-2 text-[8px] animate-sparkle pointer-events-none">✨</span>
                                  <span className="absolute bottom-2 left-2 text-[8px] animate-sparkle-delay pointer-events-none">⚡</span>
                                </>
                              )}

                              {/* Cyber Equalizer Audio/Data Waves (Bottom Right) */}
                              {isActive && (
                                <div className="flex items-end gap-[2px] h-3 absolute bottom-1.5 right-2 z-10 bg-slate-950/80 px-1 py-0.5 rounded border border-slate-800">
                                  <div className="w-[2px] rounded-full animate-eq-1" style={{ backgroundColor: customColor }} />
                                  <div className="w-[2px] rounded-full animate-eq-2" style={{ backgroundColor: customColor }} />
                                  <div className="w-[2px] rounded-full animate-eq-3" style={{ backgroundColor: customColor }} />
                                  <div className="w-[2px] rounded-full animate-eq-4" style={{ backgroundColor: customColor }} />
                                </div>
                              )}

                              {/* Floor Stage Line */}
                              <div className="absolute bottom-2 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

                              {/* Animated Robot Character */}
                              <div className={`relative z-10 transition-all ${isActive ? robotAnim : 'animate-gentle-float'}`}>
                                <Bot className="h-8 w-8 transition-colors" style={{ color: isActive ? customColor : '#475569' }} strokeWidth={1.6} />
                                {isActive && (
                                  <>
                                    {/* Glowing visor eyes strip */}
                                    <span className="absolute top-[6px] left-[9px] w-2.5 h-0.5 rounded-full shadow-[0_0_6px_currentColor] animate-pulse" style={{ backgroundColor: customColor }} />
                                    {/* Glowing antenna dot */}
                                    <span className="absolute -top-[2px] left-[13px] w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: customColor }} />
                                  </>
                                )}
                              </div>

                              {/* Inactive sleeping indicator */}
                              {!isActive && (
                                <div className="absolute top-1 right-2 flex items-center gap-1 z-10">
                                  <span className="text-[9px] text-slate-500 font-bold animate-pulse">💤 STDBY</span>
                                </div>
                              )}
                            </div>

                            {/* Single ON/OFF Toggle Button */}
                            <button
                              onClick={() => handleToggleAgent(agent.id)}
                              style={isActive ? { color: customColor, borderColor: `${customColor}60`, backgroundColor: `${customColor}15` } : {}}
                              className={`w-full py-1.5 rounded-xl text-[10px] font-extrabold tracking-wide border transition-all duration-200 z-10 flex items-center justify-center gap-1.5 ${isActive
                                ? 'hover:brightness-125'
                                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                                }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? customColor : '#64748b' }} />
                              {isActive ? 'ENCENDIDO' : 'PAUSADO'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTTOM: 3D MULTI-FLOOR BUILDING VIEW */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#F8FAFC]">Vista General del Edificio 3D</h4>
                      <span className="text-[10px] text-slate-400 font-mono">Pisos & Oficinas en Vivo</span>
                    </div>
                    <AgentBuilding3D
                      agents={agents}
                      activities={activities}
                      onAgentClick={(id) => handleTriggerWorkflow(id)}
                    />
                  </div>

                </div>
              )}

              {/* 6. WORKFLOWS (N8N) VIEW */}
              {activeTab === 'workflows' && (
                <div className="space-y-8 animate-fadeIn">

                  {/* Header Dashboard status */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-[#111827]/40 rounded-xl border border-leadforge-border gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#F8FAFC]">Workflows Integrations Panel (n8n Engine)</h3>
                      <p className="text-xs text-leadforge-muted">Monitorea y dispara procesos automáticos en segundo plano para extracción, filtrado y envío</p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-900/60 p-3 rounded-lg border border-leadforge-border/40 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-leadforge-secondary animate-pulse" />
                        <span className="text-slate-300">n8n Engine: <strong className="text-leadforge-secondary">Online</strong></span>
                      </div>
                      <div className="h-3.5 w-[1px] bg-slate-700" />
                      <div>
                        <span className="text-slate-400">Webhooks Sincronizados: <strong className="text-[#F8FAFC]">{workflows.length}</strong></span>
                      </div>
                      <button
                        onClick={() => {
                          setNewAgent({
                            name: '',
                            type: 'SUPPORT',
                            color: '#10B981',
                            prompt: '',
                            objective: '',
                            schedule: '24 Horas',
                            whatsappInstanceId: '',
                            n8nWebhookUrl: '',
                            status: 'ACTIVE'
                          });
                          setShowAddAgentModal(true);
                        }}
                        className="ml-2 px-3.5 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded-lg text-xs hover:shadow-glow-primary transition-all flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4 stroke-[3]" />
                        Agregar Nuevo Flujo
                      </button>
                    </div>
                  </div>

                  {/* Live Validation Test Result Banner */}
                  {workflowTestResult && (
                    <div className={`p-4 rounded-xl text-xs font-bold font-mono border animate-fadeIn flex items-center justify-between shadow-lg ${workflowTestResult.success ? 'bg-leadforge-secondary/15 border-leadforge-secondary/40 text-leadforge-secondary' : 'bg-leadforge-critical/15 border-leadforge-critical/40 text-leadforge-critical'
                      }`}>
                      <span>{workflowTestResult.msg}</span>
                      <button onClick={() => setWorkflowTestResult(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
                    </div>
                  )}

                  {/* WORKFLOWS GRID LIST WITH ANIMATED ROBOTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.length === 0 ? (
                      <div className="glass-panel p-6 rounded-2xl border border-dashed border-leadforge-border/60 flex flex-col items-center justify-center text-center space-y-4 col-span-full py-12">
                        <Bot className="h-12 w-12 text-slate-600 stroke-[1.5] animate-bounce" />
                        <div>
                          <h4 className="font-bold text-base text-[#F8FAFC]">No hay Agentes desplegados aún</h4>
                          <p className="text-xs text-leadforge-muted max-w-sm mt-1">Crea tu primer Agente Conversacional IA para conectar su flujo de n8n y ubicarlo en el Edificio 3D.</p>
                        </div>
                        <button
                          onClick={() => setShowAddAgentModal(true)}
                          className="px-4 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded-lg text-xs hover:shadow-glow-primary transition-all flex items-center gap-1.5"
                        >
                          <Plus className="h-4 w-4 stroke-[3]" />
                          Crear Agente IA
                        </button>
                      </div>
                    ) : (
                      agents.map((ag) => {
                        const isActive = ag.status === 'ACTIVE';
                        const linkedWf = workflows.find(w => w.name.includes(ag.name)) || {
                          id: 'wf-' + ag.id,
                          n8nWebhookUrl: ''
                        };

                        return (
                          <div
                            key={ag.id}
                            className={`glass-panel p-5 rounded-2xl border flex flex-col justify-between space-y-4 relative overflow-hidden transition-all ${isActive
                              ? 'border-leadforge-border hover:border-leadforge-primary/40 shadow-lg'
                              : 'border-leadforge-border/40 opacity-70 hover:opacity-90'
                              }`}
                          >
                            {/* Header row */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-leadforge-primary font-bold uppercase font-mono tracking-wider">n8n Live Engine</span>
                              <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${isActive ? 'bg-leadforge-secondary/20 text-leadforge-secondary border border-leadforge-secondary/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                ● {isActive ? 'Activo' : 'Pausado'}
                              </span>
                            </div>

                            {/* Animated Robot Arena */}
                            <div className="w-full h-24 rounded-xl bg-[#0B1220]/80 border border-leadforge-border/40 flex items-center justify-center relative overflow-hidden">
                              <div className="absolute bottom-2 left-4 right-4 h-[1px] bg-leadforge-border/40" />
                              <div className={`relative ${isActive ? 'animate-robot-walk' : 'animate-gentle-float'}`}>
                                <Bot className={`h-10 w-10 ${isActive ? 'text-leadforge-primary' : 'text-slate-600'} drop-shadow-lg`} strokeWidth={1.5} />
                                {isActive && (
                                  <span className="absolute top-[9px] left-[13px] w-2.5 h-1 bg-leadforge-primary rounded-full opacity-60 animate-pulse" />
                                )}
                              </div>
                              {!isActive && (
                                <div className="absolute top-2 right-3 text-[10px] text-slate-600 font-bold animate-pulse">
                                  💤 Pausado
                                </div>
                              )}
                            </div>

                            {/* Name, Role & ID Box */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-[#F8FAFC] truncate" title={ag.name}>{ag.name}</h4>
                                <span className="inline-block text-[9px] text-leadforge-primary bg-leadforge-primary/10 border border-leadforge-primary/20 px-2 py-0.5 rounded-full font-semibold">
                                  Role: {ag.type === 'SALES' ? '💼 Ventas' : ag.type === 'SUPPORT' ? '🛠️ Soporte' : ag.type}
                                </span>
                              </div>

                              <div className="flex items-center justify-between bg-[#0B1220] p-2 rounded-lg border border-slate-800 text-[10px] font-mono">
                                <span className="text-slate-400">Filtro n8n: <strong className="text-cyan-400">id=eq.{ag.id}</strong></span>
                                <button
                                  onClick={() => handleCopyAgentId(ag.id)}
                                  className={`px-2 py-1 rounded text-[9px] font-bold font-mono transition-all border flex items-center gap-1 ${copiedAgentId === ag.id
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:text-white'
                                    }`}
                                  title="Copiar id=eq.ID para el nodo Supabase en n8n"
                                >
                                  {copiedAgentId === ag.id ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-400" />
                                      <span>¡Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copiar ID</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Webhook Endpoint indicator */}
                            <div className="bg-slate-900/50 p-2.5 rounded-lg border border-leadforge-border/30 text-[10px] font-mono space-y-1">
                              <span className="text-slate-400 block">Webhook Endpoint:</span>
                              <span className="text-leadforge-primary truncate block" title={linkedWf.n8nWebhookUrl || ''}>
                                {linkedWf.n8nWebhookUrl || 'https://n8n-cafl.srv1720387.hstgr.cloud/webhook/whatsapp-evolution'}
                              </span>
                            </div>

                            {/* Control Action Buttons */}
                            <div className="space-y-2 pt-1">
                              <button
                                onClick={() => handleToggleAgent(ag.id)}
                                className={`w-full py-2 rounded-lg text-xs font-bold border transition-all ${isActive
                                  ? 'bg-leadforge-secondary/15 text-leadforge-secondary border-leadforge-secondary/40 hover:bg-leadforge-secondary/25'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-leadforge-primary hover:border-leadforge-primary/40'
                                  }`}
                              >
                                {isActive ? '● Activo — Encendido (Pausar)' : '○ Inactivo — Apagado (Encender)'}
                              </button>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleTriggerWorkflow(linkedWf.id)}
                                  className="flex-1 py-1.5 bg-gradient-to-r from-leadforge-primary/15 to-cyan-500/15 border border-leadforge-primary/40 text-leadforge-primary hover:text-slate-950 hover:from-leadforge-primary hover:to-cyan-500 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                                >
                                  <Play className="h-3 w-3 fill-current" />
                                  ⚡ Probar Live
                                </button>
                                <button
                                  onClick={() => handleDeleteAgent(ag.id)}
                                  className="px-3 py-1.5 bg-slate-900 border border-leadforge-border text-slate-400 hover:text-leadforge-critical hover:border-leadforge-critical rounded-lg text-xs font-semibold transition-all"
                                  title="Eliminar Agente & Flujo de la BD"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* RUN HISTORY LIST TABLE */}
                  <div className="glass-panel p-6 rounded-xl border border-leadforge-border space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-[#F8FAFC]">Historial de Ejecución n8n</h4>
                      <p className="text-xs text-leadforge-muted">Logs de procesos de la cola de automatización</p>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-leadforge-border/40">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-leadforge-border/60 bg-slate-900/30 text-[9px] uppercase font-bold tracking-wider text-slate-400">
                            <th className="py-2.5 px-4">ID Ejecución</th>
                            <th className="py-2.5 px-4">Workflow</th>
                            <th className="py-2.5 px-4 text-center">Estado</th>
                            <th className="py-2.5 px-4">Duración</th>
                            <th className="py-2.5 px-4 text-right">Ejecutado El</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-leadforge-border/40 text-xs font-mono">
                          {workflowRuns.map((run) => (
                            <tr key={run.id} className="hover:bg-slate-900/10">
                              <td className="py-3 px-4 text-slate-400">{run.id}</td>
                              <td className="py-3 px-4 text-[#F8FAFC] font-sans font-semibold">{run.workflow?.name || 'Workflow'}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${run.status === 'SUCCESS' ? 'bg-leadforge-secondary/20 text-leadforge-secondary' : 'bg-leadforge-critical/20 text-leadforge-critical'
                                  }`}>
                                  {run.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {run.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-300">{run.durationMs}ms</td>
                              <td className="py-3 px-4 text-right text-slate-500">{new Date(run.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* 7. CONFIGURATION / SETTINGS VIEW */}
              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto glass-panel p-8 rounded-xl border border-leadforge-border space-y-8 animate-fadeIn">

                  {/* Segment: Profile */}
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2 border-b border-leadforge-border/40 pb-2">
                      <ShieldCheck className="h-5 w-5 text-leadforge-primary" />
                      Organización & Acceso Multiempresa
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Nombre de la Organización</span>
                        <strong className="text-base text-[#F8FAFC] block mt-1">Gestiva Corporativo S.A. de C.V.</strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Tenant Tenant ID</span>
                        <code className="text-leadforge-primary block mt-1 font-mono bg-slate-900 p-1.5 rounded border border-leadforge-border max-w-fit">
                          org_gestiva_fallback_3498
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Segment: API Connections */}
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2 border-b border-leadforge-border/40 pb-2">
                      <Cpu className="h-5 w-5 text-leadforge-primary" />
                      Configuración de API Keys & Tokens
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">OpenAI API Key</label>
                        <input
                          type="password"
                          value="sk-proj-••••••••••••••••••••"
                          disabled
                          className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs text-slate-500 font-mono focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 block">Sincronizado en variables de entorno `.env` del servidor</span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Evolution API Webhook URL</label>
                        <input
                          type="text"
                          value="https://evolution.leadforge.ai"
                          disabled
                          className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs text-slate-500 font-mono focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Apify Scraper Token</label>
                        <input
                          type="password"
                          value="••••••••••••••••"
                          disabled
                          className="w-full p-2.5 rounded-lg bg-[#0B1220] border border-leadforge-border text-xs text-slate-500 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save feedback banner */}
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-leadforge-secondary/10 border border-leadforge-secondary/20 text-xs text-leadforge-secondary">
                    <Check className="h-4 w-4" />
                    <span>Conexiones activas y validadas en el cluster Docker local. Todo listo para operar.</span>
                  </div>

                </div>
              )}

            </>
          )}

        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODALS VIEWPORTS */}
      {/* ---------------------------------------------------- */}

      {/* MODAL 1: ADD MANUAL PROSPECT */}
      {showAddProspectModal && (
        <div className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-leadforge-border p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-leadforge-border/40 pb-3">
              <h3 className="font-extrabold text-base text-[#F8FAFC]">Agregar Nuevo Prospecto Manual</h3>
              <button onClick={() => setShowAddProspectModal(false)} className="text-slate-400 hover:text-[#F8FAFC] text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateProspect} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Nombre de la Empresa *</label>
                  <input
                    type="text" required
                    value={newProspect.name}
                    onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Nombre de Contacto</label>
                  <input
                    type="text"
                    value={newProspect.contactName}
                    onChange={(e) => setNewProspect({ ...newProspect, contactName: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Teléfono (WhatsApp)</label>
                  <input
                    type="text"
                    value={newProspect.phone}
                    onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Email de Negocio</label>
                  <input
                    type="email"
                    value={newProspect.email}
                    onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Página Web URL</label>
                <input
                  type="text"
                  value={newProspect.website}
                  onChange={(e) => setNewProspect({ ...newProspect, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Sector</label>
                  <input
                    type="text"
                    value={newProspect.industry}
                    onChange={(e) => setNewProspect({ ...newProspect, industry: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Ubicación</label>
                  <input
                    type="text"
                    value={newProspect.location}
                    onChange={(e) => setNewProspect({ ...newProspect, location: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-leadforge-border/40">
                <button
                  type="button"
                  onClick={() => setShowAddProspectModal(false)}
                  className="px-4 py-2 border border-leadforge-border text-slate-400 hover:text-[#F8FAFC] rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded text-xs"
                >
                  Agregar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SEARCH GOOGLE MAPS (APIFY SCRAPER) */}
      {showScrapeModal && (
        <div className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111827] border border-leadforge-border p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-leadforge-border/40 pb-3">
              <h3 className="font-extrabold text-base text-[#F8FAFC] flex items-center gap-2">
                <Search className="w-4 h-4 text-leadforge-primary" />
                Extraer Prospectos de Google Maps
              </h3>
              <button onClick={() => setShowScrapeModal(false)} className="text-slate-400 hover:text-[#F8FAFC] text-sm">✕</button>
            </div>

            <form onSubmit={handleRunScraper} className="space-y-4 text-xs">
              <div className="space-y-2 p-3 bg-leadforge-primary/10 border border-leadforge-primary/20 rounded-lg text-slate-300">
                <p>
                  El sistema lanzará una tarea de extracción en la plataforma **Apify (Google Maps Scraper Actor)** para recolectar leads con datos verificados.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Query de Búsqueda (Palabra Clave y Ciudad) *</label>
                <input
                  type="text" required
                  placeholder="Ej: Clinicas Dentales Monterrey"
                  value={scrapeQuery.query}
                  onChange={(e) => setScrapeQuery({ ...scrapeQuery, query: e.target.value })}
                  className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Límite de resultados a importar</label>
                <select
                  value={scrapeQuery.limit}
                  onChange={(e) => setScrapeQuery({ ...scrapeQuery, limit: Number(e.target.value) })}
                  className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:outline-none text-slate-300"
                >
                  <option value="2">2 Leads (Rápido)</option>
                  <option value="5">5 Leads</option>
                  <option value="10">10 Leads</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-leadforge-border/40">
                <button
                  type="button"
                  onClick={() => setShowScrapeModal(false)}
                  className="px-4 py-2 border border-leadforge-border text-slate-400 hover:text-[#F8FAFC] rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                  Iniciar Extracción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CANAL / SESSION INSTANCE */}
      {showAddInstanceModal && (
        <div className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111827] border border-leadforge-border p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-leadforge-border/40 pb-3">
              <h3 className="font-extrabold text-base text-[#F8FAFC] flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                Crear Nuevo Canal / Instancia
              </h3>
              <button onClick={() => setShowAddInstanceModal(false)} className="text-slate-400 hover:text-[#F8FAFC] text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateInstance} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Nombre de la Sesión o Canal *</label>
                <input
                  type="text" required
                  placeholder="Ej: WhatsApp Ventas, Telegram Bot, Webhook"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none text-slate-200 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Medio de Conexión / Plataforma</label>
                <select className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:outline-none text-slate-300">
                  <option value="WHATSAPP">🟢 WhatsApp Web (Evolution API v1.5)</option>
                  <option value="TELEGRAM">🔵 Telegram Bot API</option>
                  <option value="INSTAGRAM">🟣 Instagram Direct & Messenger</option>
                  <option value="WEBHOOK">⚡ Webhook / API Personalizada (n8n)</option>
                  <option value="VOICE_AI">🎙️ Telefonía & Agente de Voz (SIP)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-leadforge-border/40">
                <button
                  type="button"
                  onClick={() => setShowAddInstanceModal(false)}
                  className="px-4 py-2 border border-leadforge-border text-slate-400 hover:text-[#F8FAFC] rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-extrabold rounded text-xs"
                >
                  Crear Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: QR CODE SCANNER PREVIEW WITH CYBER SCANNER ANIMATION */}
      {qrCodeModal && qrCodeModal.open && (
        <div className="fixed inset-0 bg-[#0B1220]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#111827] via-[#0F172A] to-[#0B1220] border border-cyan-500/40 p-6 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] space-y-6 animate-scaleIn text-center relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-emerald-500/10 pointer-events-none" />

            <div className="flex justify-between items-center border-b border-slate-800 pb-3 text-left relative z-10">
              <h3 className="font-extrabold text-base text-[#F8FAFC] flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                Vincular Canal de Comunicación
              </h3>
              <button onClick={() => setQrCodeModal(null)} className="text-slate-400 hover:text-[#F8FAFC] text-sm font-bold">✕</button>
            </div>

            {connectionSuccessMsg ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4 relative z-10 animate-scaleIn">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-emerald-400 opacity-60" />
                  <div className="p-4 bg-emerald-500/20 border-2 border-emerald-400 rounded-full text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                    <CheckCircle2 className="h-12 w-12 stroke-[2.5]" />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-emerald-400">¡Canal Vinculado Exitosamente!</h4>
                  <p className="text-xs text-slate-300 font-mono mt-1">Línea: {connectionSuccessMsg}</p>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest animate-pulse">Sincronizando estado en vivo...</span>
              </div>
            ) : qrCodeModal.loading ? (
              <div className="flex flex-col items-center justify-center h-52 space-y-4 relative z-10">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-cyan-400 opacity-50" />
                  <RefreshCw className="h-9 w-9 animate-spin text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-cyan-300 animate-pulse">Generando Código QR Seguro con Evolution API...</span>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                <span className="text-xs text-slate-300 block max-w-xs mx-auto leading-relaxed">
                  Escanea este código QR con WhatsApp en tu celular (<span className="text-cyan-400 font-bold">Dispositivos Vinculados</span>) para enlazar tu agente IA.
                </span>

                {/* Animated Cyber Laser QR Frame */}
                <div className="relative w-56 h-56 mx-auto bg-white p-3 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.5)] border-2 border-cyan-400 overflow-hidden flex items-center justify-center">
                  {qrCodeModal.qrCodeUrl ? (
                    <img src={qrCodeModal.qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center space-y-2 text-slate-800">
                      <Radio className="w-8 h-8 text-cyan-600 animate-pulse" />
                      <span className="text-xs font-bold text-slate-900">Sesión Lista / Conectada</span>
                      <span className="text-[10px] text-slate-600 font-medium">Esta instancia ya se encuentra activa en Evolution API.</span>
                      <button
                        type="button"
                        onClick={() => {
                          const inst = whatsappInstances.find(w => w.id === qrCodeModal.instanceId);
                          if (inst) handleShowQR(inst);
                        }}
                        className="mt-1 px-3 py-1 bg-cyan-500 text-slate-950 text-[10px] font-extrabold rounded-lg shadow hover:bg-cyan-400 transition-all"
                      >
                        🔄 Forzar Generar QR Nuevo
                      </button>
                    </div>
                  )}

                  {/* Animated Cyber Laser Scanner Beam */}
                  {qrCodeModal.qrCodeUrl && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-pulse pointer-events-none" style={{ top: '45%' }} />
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <button
                    onClick={() => handleValidateQR(qrCodeModal.instanceId)}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition-all"
                  >
                    ⚡ Simular Escaneo Exitoso
                  </button>
                  <button
                    onClick={() => setQrCodeModal(null)}
                    className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-[#F8FAFC] rounded-xl text-xs font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: ADD AI AGENT */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111827] border border-leadforge-border p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-leadforge-border/40 pb-3">
              <h3 className="font-extrabold text-base text-[#F8FAFC]">Configurar Agente Conversacional IA</h3>
              <button onClick={() => setShowAddAgentModal(false)} className="text-slate-400 hover:text-[#F8FAFC] text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Nombre del Agente *</label>
                  <input
                    type="text" required
                    placeholder="Ej. Agente Ventas WhatsApp"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Tipo / Rol *</label>
                  <select
                    value={newAgent.type}
                    onChange={(e) => setNewAgent({ ...newAgent, type: e.target.value as any })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:outline-none text-slate-300"
                  >
                    <option value="SALES">Ventas / Prospección</option>
                    <option value="SUPPORT">Soporte Técnico / FAQ</option>
                    <option value="BOOKING">Reservaciones y Citas</option>
                    <option value="LEAD_GEN">Captación y Filtro Inbound</option>
                    <option value="IT_DEVOPS">💻 TI / Servidores & Infraestructura</option>
                  </select>
                </div>
              </div>

              {/* Color Selector Palette */}
              <div className="space-y-1.5 p-2.5 bg-[#0B1220]/60 rounded-xl border border-leadforge-border/40">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] flex items-center justify-between">
                  <span>Color Neón del Agente *</span>
                  <span className="text-[9px] font-mono text-leadforge-primary">{newAgent.color || '#06B6D4'}</span>
                </label>
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  {[
                    { hex: '#06B6D4', label: 'Cian Neón' },
                    { hex: '#10B981', label: 'Esmeralda' },
                    { hex: '#F59E0B', label: 'Ámbar' },
                    { hex: '#8B5CF6', label: 'Púrpura' },
                    { hex: '#EC4899', label: 'Rosa Neón' },
                    { hex: '#F43F5E', label: 'Carmesí' },
                    { hex: '#6366F1', label: 'Índigo' },
                    { hex: '#F97316', label: 'Naranja' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewAgent({ ...newAgent, color: c.hex })}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center relative ${(newAgent.color || '#06B6D4') === c.hex
                        ? 'scale-125 ring-2 ring-white shadow-lg z-10'
                        : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {(newAgent.color || '#06B6D4') === c.hex && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Horario de Operación</label>
                  <input
                    type="text"
                    placeholder="Ej: 09:00 - 18:00 o 24 Horas"
                    value={newAgent.schedule}
                    onChange={(e) => setNewAgent({ ...newAgent, schedule: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Instancia WhatsApp Vinculada</label>
                  <select
                    value={newAgent.whatsappInstanceId}
                    onChange={(e) => setNewAgent({ ...newAgent, whatsappInstanceId: e.target.value })}
                    className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:outline-none text-slate-300"
                  >
                    <option value="">Ninguna - Atender por Consola</option>
                    {whatsappInstances.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">URL del Webhook (n8n Engine Automation) *</label>
                <input
                  type="url" required
                  placeholder="https://tu-servidor-n8n.com/webhook/mi-flujo"
                  value={newAgent.n8nWebhookUrl}
                  onChange={(e) => setNewAgent({ ...newAgent, n8nWebhookUrl: e.target.value })}
                  className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none font-mono text-xs text-leadforge-primary"
                />
                <span className="text-[9px] text-slate-500 block">⚡ Al guardar, el Agente y su flujo n8n quedarán activos e instalados en el Edificio 3D de inmediato.</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Objetivo Principal del Agente *</label>
                <input
                  type="text" required
                  placeholder="Ej: Conseguir correos y agendar llamada de demo en Calendly."
                  value={newAgent.objective}
                  onChange={(e) => setNewAgent({ ...newAgent, objective: e.target.value })}
                  className="w-full p-2 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">System Prompt de Personalidad *</label>
                <textarea
                  rows={4} required
                  placeholder="Eres un agente comercial dedicado a buscar..."
                  value={newAgent.prompt}
                  onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
                  className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-leadforge-border/40">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="px-4 py-2 border border-leadforge-border text-slate-400 hover:text-[#F8FAFC] rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded text-xs"
                >
                  Desplegar Agente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTRAR NUEVO WORKFLOW (N8N WEBHOOK) */}
      {showAddWorkflowModal && (
        <div className="fixed inset-0 bg-[#0B1220]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111827] border border-leadforge-border p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-leadforge-border/40 pb-3">
              <h3 className="font-extrabold text-base text-[#F8FAFC] flex items-center gap-2">
                <Zap className="w-4 h-4 text-leadforge-primary" />
                Registrar Nuevo Workflow (n8n)
              </h3>
              <button onClick={() => setShowAddWorkflowModal(false)} className="text-slate-400 hover:text-[#F8FAFC] text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Nombre del Agente o Workflow *</label>
                <input
                  type="text" required
                  placeholder="Ej: Gesti — Agente Dual (n8n)"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none text-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Tipo de Flujo</label>
                  <select
                    value={newWorkflow.type}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, type: e.target.value })}
                    className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:outline-none text-slate-300"
                  >
                    <option value="WHATSAPP">WhatsApp Automation</option>
                    <option value="DISCOVERY">Descubrimiento de Leads</option>
                    <option value="ENRICHMENT">Enriquecimiento IA</option>
                    <option value="REPORT">Reportes Ejecutivos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">Estado Inicial</label>
                  <select
                    value={newWorkflow.status}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, status: e.target.value })}
                    className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:outline-none text-slate-300"
                  >
                    <option value="ACTIVE">● Activo</option>
                    <option value="INACTIVE">○ Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase tracking-wider block text-[9px]">URL del Webhook (n8n Production URL) *</label>
                <input
                  type="url" required
                  placeholder="https://n8n-cafl.srv1720387.hstgr.cloud/webhook/whatsapp-evolution"
                  value={newWorkflow.n8nWebhookUrl}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, n8nWebhookUrl: e.target.value })}
                  className="w-full p-2.5 bg-[#0B1220] border border-leadforge-border rounded focus:border-leadforge-primary focus:outline-none font-mono text-[11px] text-leadforge-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-leadforge-border/40">
                <button
                  type="button"
                  onClick={() => setShowAddWorkflowModal(false)}
                  className="px-4 py-2 border border-leadforge-border text-slate-400 hover:text-[#F8FAFC] rounded text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5"
                >
                  Vincular Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Cyber iPhone Floating Simulator */}
      <WhatsAppSimulator
        isOpen={showWhatsappSim}
        onClose={() => setShowWhatsappSim(false)}
        leadName={simLead.name}
        leadPhone={simLead.phone}
      />

    </div>
  );
}

// Icon Wrapper Components
function QrCodeModalTrigger({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125v-2.25ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125v-2.25ZM14.625 3.75c-.621 0-1.125.504-1.125 1.125v2.25c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-2.25ZM16.5 16.5h.008v.008H16.5V16.5Zm0 1.875h.008v.008H16.5v-.008Zm-1.875 0h.008v.008h-.008v-.008Zm0-1.875h.008v.008h-.008V16.5Zm1.875-1.875h.008v.008H16.5v-.008Zm-1.875 0h.008v.008h-.008v-.008Zm3.75 3.75h.008v.008h-.008v-.008Zm0-1.875h.008v.008h-.008v-.008Zm0-1.875h.008v.008h-.008v-.008ZM14.625 14.625h.008v.008h-.008v-.008Zm0 3.75h.008v.008h-.008v-.008ZM18.375 18.375h.008v.008h-.008v-.008Z" />
    </svg>
  );
}
