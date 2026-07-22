-- ====================================================================
-- 🚀 LEADFORGE AI — SCHEMA COMPLETO PARA SUPABASE POSTGRESQL
-- ====================================================================
-- Este script crea todas las tablas de la arquitectura de LeadForge AI:
-- Multi-Tenancy, Usuarios, Prospectos, Análisis IA, WhatsApp (Evolution API),
-- Agentes Conversacionales, Workflows (n8n), Auditoría y Reportes.
--
-- INSTRUCCIONES EN SUPABASE:
-- 1. Entra a tu proyecto en Supabase (https://supabase.com).
-- 2. Abre la pestaña "SQL Editor" en el menú izquierdo.
-- 3. Crea una "New query", pega todo este código y presiona "Run".
-- ====================================================================

-- Habilitar la extensión de generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TABLA: Company (Organizaciones / Tenants)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 2. TABLA: User (Usuarios y Roles de la Plataforma)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER', -- OWNER, ADMIN, MEMBER
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 3. TABLA: Membership (Planes de Suscripción y Estado de Cuenta)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Membership" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "plan" TEXT NOT NULL DEFAULT 'FREE', -- FREE, PRO, ENTERPRISE
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, CANCELLED
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 4. TABLA: ProspectSource (Orígenes de Leads: Apify, Google Maps, Manual)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ProspectSource" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "name" TEXT UNIQUE NOT NULL
);

-- --------------------------------------------------------------------
-- 5. TABLA: Prospect (Prospectos y Oportunidades Comerciales)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Prospect" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "sourceId" TEXT REFERENCES "ProspectSource"("id") ON DELETE SET NULL,
    "score" INT NOT NULL DEFAULT 0, -- 0 a 100 (Calificación IA)
    "status" TEXT NOT NULL DEFAULT 'NEW', -- NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CLOSED_WON, CLOSED_LOST
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 6. TABLA: SocialSignal (Señales de Inteligencia de Prospección)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SocialSignal" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "prospectId" TEXT NOT NULL REFERENCES "Prospect"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL, -- HIRING, TECH_STACK, FUNDING, SOCIAL_POST
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 7. TABLA: Opportunity (Embudo de Ventas y Negociaciones)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Opportunity" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "prospectId" TEXT NOT NULL REFERENCES "Prospect"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "stage" TEXT NOT NULL, -- DISCOVERY, PRESENTATION, NEGOTIATION, WON, LOST
    "confidence" INT NOT NULL DEFAULT 50,
    "aiAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 8. TABLA: WhatsappInstance (Conexiones Evolution API)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "WhatsappInstance" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED', -- CONNECTED, DISCONNECTED, PAUSED
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 9. TABLA: Agent (Agentes Conversacionales Autónomos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "whatsappInstanceId" TEXT REFERENCES "WhatsappInstance"("id") ON DELETE SET NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- SALES, SUPPORT, BOOKING, LEAD_GEN
    "prompt" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "schedule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE', -- ACTIVE, INACTIVE, WAITING, ERROR
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 10. TABLA: AgentSession (Sesiones de Chat Activas en WhatsApp)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AgentSession" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "agentId" TEXT NOT NULL REFERENCES "Agent"("id") ON DELETE CASCADE,
    "contactPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, ESCALATED
    "messages" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 11. TABLA: Workflow (Pipelines de Automatización n8n)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Workflow" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- DISCOVERY, ENRICHMENT, WHATSAPP, REPORT
    "status" TEXT NOT NULL DEFAULT 'INACTIVE', -- ACTIVE, INACTIVE
    "n8nWebhookUrl" TEXT,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 12. TABLA: WorkflowRun (Historial de Ejecuciones de n8n)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "WorkflowRun" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "workflowId" TEXT NOT NULL REFERENCES "Workflow"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL, -- SUCCESS, FAILED, RUNNING
    "error" TEXT,
    "durationMs" INT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 13. TABLA: Activity (Auditoría Global y Feed de Eventos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Activity" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "type" TEXT NOT NULL, -- LEAD_CREATED, LEAD_SCORED, WHATSAPP_SENT, AGENT_TRIGGERED
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 14. TABLA: Report (Reportes e Informes Ejecutivos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- DAILY, WEEKLY, MONTHLY
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- ⚡ ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- ====================================================================
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"("email");
CREATE INDEX IF NOT EXISTS "idx_user_company" ON "User"("companyId");
CREATE INDEX IF NOT EXISTS "idx_prospect_company" ON "Prospect"("companyId");
CREATE INDEX IF NOT EXISTS "idx_prospect_status" ON "Prospect"("status");
CREATE INDEX IF NOT EXISTS "idx_prospect_score" ON "Prospect"("score");
CREATE INDEX IF NOT EXISTS "idx_agent_company" ON "Agent"("companyId");
CREATE INDEX IF NOT EXISTS "idx_agent_status" ON "Agent"("status");
CREATE INDEX IF NOT EXISTS "idx_workflow_company" ON "Workflow"("companyId");
CREATE INDEX IF NOT EXISTS "idx_activity_company" ON "Activity"("companyId");

-- ====================================================================
-- 🔄 FUNCIÓN Y TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA DE "updatedAt"
-- ====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_company_updated_at BEFORE UPDATE ON "Company" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_prospect_updated_at BEFORE UPDATE ON "Prospect" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_whatsapp_instance_updated_at BEFORE UPDATE ON "WhatsappInstance" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_agent_updated_at BEFORE UPDATE ON "Agent" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_workflow_updated_at BEFORE UPDATE ON "Workflow" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fin del schema DDL de Supabase
