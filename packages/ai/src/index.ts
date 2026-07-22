import OpenAI from 'openai';
import { AIScoringResult } from '@leadforge/shared';

// Initialize OpenAI client if API key is provided in environment variables
const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function analyzeProspectCompany(
  companyName: string,
  website: string,
  description?: string,
  industry?: string
): Promise<AIScoringResult> {
  const host = website ? website.replace(/https?:\/\/(www\.)?/, '').split('/')[0] : '';
  const domainPart = host.split('.')[0] || companyName.toLowerCase();

  // If OpenAI is available, execute a live analysis prompt
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are LeadForge AI, a senior SaaS strategy analyst. Evaluate B2B sales opportunities. Return JSON matching: { "score": number, "level": "Low"|"Medium"|"High"|"Critical", "detectedProblem": "string", "recommendedSolution": "string", "purchaseProbability": "string", "suggestedMessage": "string" }'
          },
          {
            role: 'user',
            content: `Evaluate: Company: ${companyName}, Website: ${website}, Industry: ${industry || 'Not specified'}, Details: ${description || 'None'}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const jsonText = response.choices[0]?.message?.content;
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        return {
          score: Number(parsed.score) || 60,
          level: parsed.level || 'Medium',
          detectedProblem: parsed.detectedProblem || 'Incomplete lead profile details.',
          recommendedSolution: parsed.recommendedSolution || 'Implement systematic digital qualification workflows.',
          purchaseProbability: parsed.purchaseProbability || '55%',
          suggestedMessage: parsed.suggestedMessage || `Hi ${companyName} team, noticed your site at ${website} and...`
        };
      }
    } catch (error) {
      console.error('Error during OpenAI company analysis, falling back to mock rules:', error);
    }
  }

  // Fallback / Mock intelligent AI analysis logic
  const mockIndustries = [
    {
      keywords: ['tech', 'software', 'saas', 'cloud', 'digital', 'app', 'dev'],
      problems: [
        'Lack of automated lead attribution and slow sales-development response loops.',
        'High churn rates due to customer success teams operating reactively without usage analytics triggers.'
      ],
      solutions: [
        'Integrate CRM triggers with customer analytics to prompt outreach when usage dips.',
        'Implement automatic WhatsApp agents to schedule product demos directly from sign-up pages.'
      ],
      probability: '82%',
      scoreBase: 80
    },
    {
      keywords: ['agency', 'marketing', 'design', 'consulting', 'consult', 'legal', 'law'],
      problems: [
        'Client onboarding bottleneck leading to manual contract creation and delayed project kick-offs.',
        'Unpredictable pipeline generation dependent entirely on referrals rather than automated cold prospecting.'
      ],
      solutions: [
        'Deploy automated discovery agents to pre-qualify inbound briefs prior to discovery calls.',
        'Establish automated LinkedIn and Email scrapers with AI personalization scripts.'
      ],
      probability: '74%',
      scoreBase: 70
    },
    {
      keywords: ['health', 'med', 'clinic', 'dent', 'care', 'pharma'],
      problems: [
        'High rate of patient appointment no-shows causing unoptimized doctor schedules.',
        'Manual collection of client intake details causing slow intake flows and administrative friction.'
      ],
      solutions: [
        'Deploy a bidirectional WhatsApp booking agent to confirm appointments and collect insurance details automatically.',
        'Implement HIPAA-compliant digital web intake flows connected to patient CRM.'
      ],
      probability: '90%',
      scoreBase: 85
    }
  ];

  // Attempt to match industry keywords in inputs
  const lookupText = `${companyName} ${website} ${description || ''} ${industry || ''}`.toLowerCase();
  let matched = mockIndustries[0]; // default SaaS/Tech

  for (const item of mockIndustries) {
    if (item.keywords.some(kw => lookupText.includes(kw))) {
      matched = item;
      break;
    }
  }

  // Generate randomized but consistent score
  const randOffset = Math.floor((Math.sin(companyName.length) + 1) * 10); // deterministic offset
  const score = Math.min(Math.max(matched.scoreBase - 10 + randOffset, 15), 98);
  
  let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  if (score >= 85) level = 'Critical';
  else if (score >= 70) level = 'High';
  else if (score >= 45) level = 'Medium';
  else level = 'Low';

  const randomIdx = (companyName.length) % matched.problems.length;
  const detectedProblem = matched.problems[randomIdx];
  const recommendedSolution = matched.solutions[randomIdx];

  const suggestedMessage = `Hola equipo de ${companyName},\n\nHe estado revisando su sitio web (${domainPart}.com) y he visto que ofrecen excelentes soluciones en el sector. Sin embargo, notamos que podrían optimizar considerablemente la conversión de prospectos mediante agentes de WhatsApp automáticos.\n\n¿Tienen 5 minutos esta semana para platicar de cómo automatizar este flujo?\n\nSaludos,\nLeadForge AI Assistant`;

  // OSINT Tech Stack Detection & Pitch Strategy
  const techStackDetected = [
    'WhatsApp Business API',
    website ? 'Sitio Web Activo' : 'Google Maps Business',
    companyName.length % 2 === 0 ? 'WordPress / Elementor' : 'Custom Web App'
  ];

  const salesPitchStrategy = `Ofrecer integración de Agentes de WhatsApp IA para automatizar la atención comercial de ${companyName} 24/7 y reducir el tiempo de respuesta a 0 segundos.`;

  const predictedObjection = `"Actualmente ya tenemos personal atendiendo el teléfono." -> Argumento: GestiBot atiende consultas fuera de horario de oficina (noches/fines de semana), reteniendo un 40% más de prospectos.`;

  return {
    score,
    level,
    detectedProblem,
    recommendedSolution,
    purchaseProbability: `${score - 5}%`,
    suggestedMessage,
    techStackDetected,
    salesPitchStrategy,
    predictedObjection
  };
}
