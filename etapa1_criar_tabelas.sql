-- ============================================================
-- AffiliDash v3 — ETAPA 1: Criar tabelas, índices e constraints
-- ============================================================
-- SEGURO: não altera nenhuma tabela existente
-- SEGURO: não migra dados
-- SEGURO: não cria funções
-- SEGURO: pode ser revertido com etapa1_reverter.sql
-- ============================================================


-- ── 1. shopee_pedidos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopee_pedidos (
  order_id          TEXT        NOT NULL,
  conversion_id     TEXT,
  conta             TEXT        NOT NULL,
  data_pedido       DATE        NOT NULL,
  hora_pedido       SMALLINT,
  data_conclusao    DATE,
  data_click        DATE,
  sub_id            TEXT,
  operacao          TEXT,
  status            TEXT,
  comissao_bruta    NUMERIC(10,2) DEFAULT 0,
  venda_total       NUMERIC(10,2) DEFAULT 0,
  venda_direta      BOOLEAN       DEFAULT FALSE,
  shop_name         TEXT,
  item_name         TEXT,
  channel_type      TEXT,
  attribution_type  TEXT,
  fonte             TEXT,
  updated_at        TIMESTAMPTZ   DEFAULT NOW(),
  CONSTRAINT shopee_pedidos_pkey PRIMARY KEY (order_id)
);

CREATE INDEX IF NOT EXISTS idx_shopee_pedidos_conta_data
  ON shopee_pedidos (conta, data_pedido);

CREATE INDEX IF NOT EXISTS idx_shopee_pedidos_data
  ON shopee_pedidos (data_pedido);

CREATE INDEX IF NOT EXISTS idx_shopee_pedidos_sub_id
  ON shopee_pedidos (sub_id);

CREATE INDEX IF NOT EXISTS idx_shopee_pedidos_status
  ON shopee_pedidos (status);

CREATE INDEX IF NOT EXISTS idx_shopee_pedidos_data_conclusao
  ON shopee_pedidos (data_conclusao);


-- ── 2. shopee_cliques ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopee_cliques (
  id            TEXT        NOT NULL,
  conta         TEXT        NOT NULL,
  data          DATE        NOT NULL,
  hora          SMALLINT,
  sub_id        TEXT,
  cliques       INTEGER     DEFAULT 0,
  regiao        TEXT,
  referenciador TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shopee_cliques_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_shopee_cliques_conta_data
  ON shopee_cliques (conta, data);

CREATE INDEX IF NOT EXISTS idx_shopee_cliques_sub_id
  ON shopee_cliques (sub_id);


-- ── 3. meta_ads ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta_ads (
  id               TEXT           NOT NULL,
  conta            TEXT           NOT NULL,
  conta_meta_id    TEXT           NOT NULL,
  data             DATE           NOT NULL,
  campanha         TEXT,
  campanha_id      TEXT,
  status_camp      TEXT,
  gasto            NUMERIC(10,2)  DEFAULT 0,
  impressoes       INTEGER        DEFAULT 0,
  alcance          INTEGER        DEFAULT 0,
  frequencia       NUMERIC(6,4)   DEFAULT 0,
  cliques_link     INTEGER        DEFAULT 0,
  cliques_total    INTEGER        DEFAULT 0,
  ctr_link         NUMERIC(8,6)   DEFAULT 0,
  cpc_link         NUMERIC(8,4)   DEFAULT 0,
  cpm              NUMERIC(8,4)   DEFAULT 0,
  resultado        INTEGER        DEFAULT 0,
  custo_resultado  NUMERIC(10,2)  DEFAULT 0,
  updated_at       TIMESTAMPTZ    DEFAULT NOW(),
  CONSTRAINT meta_ads_pkey PRIMARY KEY (id),
  CONSTRAINT meta_ads_unique_campanha
    UNIQUE (conta_meta_id, data, campanha)
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_conta_data
  ON meta_ads (conta, data);

CREATE INDEX IF NOT EXISTS idx_meta_ads_data
  ON meta_ads (data);

CREATE INDEX IF NOT EXISTS idx_meta_ads_conta_meta_id
  ON meta_ads (conta_meta_id);


-- ── 4. lancamentos_manuais ───────────────────────────────────
CREATE TABLE IF NOT EXISTS lancamentos_manuais (
  id           TEXT           NOT NULL,
  conta        TEXT           NOT NULL,
  data         DATE           NOT NULL,
  sub_id       TEXT,
  operacao     TEXT,
  comissao     NUMERIC(10,2)  DEFAULT 0,
  venda_total  NUMERIC(10,2)  DEFAULT 0,
  updated_at   TIMESTAMPTZ    DEFAULT NOW(),
  CONSTRAINT lancamentos_manuais_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_data
  ON lancamentos_manuais (conta, data);


-- ── 5. sync_control ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_control (
  id                SERIAL        NOT NULL,
  conta_id          TEXT          NOT NULL,
  plataforma        TEXT          NOT NULL,
  ultima_data       DATE,
  ultima_execucao   TIMESTAMPTZ,
  status            TEXT          DEFAULT 'pendente',
  registros_ultima  INTEGER       DEFAULT 0,
  CONSTRAINT sync_control_pkey     PRIMARY KEY (id),
  CONSTRAINT sync_control_unique   UNIQUE (conta_id, plataforma)
);


-- ── 6. sync_logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id                  SERIAL        NOT NULL,
  data_execucao       TIMESTAMPTZ   DEFAULT NOW(),
  conta               TEXT          NOT NULL,
  plataforma          TEXT          NOT NULL,
  inicio              DATE,
  fim                 DATE,
  status              TEXT          NOT NULL,
  registros_recebidos INTEGER       DEFAULT 0,
  registros_salvos    INTEGER       DEFAULT 0,
  erro                TEXT,
  CONSTRAINT sync_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_conta
  ON sync_logs (conta, plataforma);

CREATE INDEX IF NOT EXISTS idx_sync_logs_data
  ON sync_logs (data_execucao DESC);


-- ============================================================
-- RELATÓRIO DE VERIFICAÇÃO
-- Execute este bloco após o script acima para confirmar tudo
-- ============================================================

SELECT
  t.table_name                                    AS tabela,
  COUNT(c.column_name)                            AS colunas,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc
   WHERE tc.table_name = t.table_name
     AND tc.constraint_type = 'PRIMARY KEY')      AS pk,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc
   WHERE tc.table_name = t.table_name
     AND tc.constraint_type = 'UNIQUE')           AS unique_constraints
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_name = t.table_name
  AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'shopee_pedidos','shopee_cliques','meta_ads',
    'lancamentos_manuais','sync_control','sync_logs'
  )
GROUP BY t.table_name
ORDER BY t.table_name;
