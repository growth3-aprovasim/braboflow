-- ============================================================
-- BRABOFLOW - SCHEMA SUPABASE COM PREFIXO bflow_
-- ============================================================

-- 1. TABELA DE CAMPANHAS (bflow_campaigns)
CREATE TABLE IF NOT EXISTS public.bflow_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    status TEXT DEFAULT 'Ativa',
    badge_color TEXT DEFAULT '#38bdf8',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE LINKS PRÉ-DEFINIDOS (bflow_campaign_links)
CREATE TABLE IF NOT EXISTS public.bflow_campaign_links (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES public.bflow_campaigns(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE COLUNAS CUSTOMIZADAS DA CAMPANHA (bflow_custom_columns)
CREATE TABLE IF NOT EXISTS public.bflow_custom_columns (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES public.bflow_campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE DISPAROS / MENSAGENS (bflow_disparos)
CREATE TABLE IF NOT EXISTS public.bflow_disparos (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES public.bflow_campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    stage TEXT DEFAULT 'Em Rascunho',
    channel TEXT NOT NULL,
    scheduled_date DATE,
    scheduled_time TEXT,
    selected_link_id TEXT,
    variables JSONB DEFAULT '{}'::jsonb,
    copy_text TEXT,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    attachment JSONB,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE FILTROS SALVOS / VIEWS (bflow_custom_filters)
CREATE TABLE IF NOT EXISTS public.bflow_custom_filters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    conjunction TEXT DEFAULT 'AND',
    rules JSONB DEFAULT '[]'::jsonb,
    hidden_columns JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.bflow_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bflow_campaign_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bflow_custom_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bflow_disparos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bflow_custom_filters;

-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) - Permite leitura e escrita via chave anon pública
ALTER TABLE public.bflow_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bflow_campaign_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bflow_custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bflow_disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bflow_custom_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público completo bflow_campaigns" ON public.bflow_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público completo bflow_campaign_links" ON public.bflow_campaign_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público completo bflow_custom_columns" ON public.bflow_custom_columns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público completo bflow_disparos" ON public.bflow_disparos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público completo bflow_custom_filters" ON public.bflow_custom_filters FOR ALL USING (true) WITH CHECK (true);

-- CRIAR BUCKET DE STORAGE PARA ANEXOS (bflow-attachments)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bflow-attachments', 'bflow-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Acesso público storage bflow-attachments" ON storage.objects
FOR ALL USING (bucket_id = 'bflow-attachments')
WITH CHECK (bucket_id = 'bflow-attachments');
