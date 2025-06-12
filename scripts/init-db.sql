-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create roles for PostgREST
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO web_anon;

-- Create AI-related tables with TimescaleDB features
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('ai_interactions', 'created_at', if_not_exists => TRUE);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_guild ON ai_interactions(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_embedding ON ai_interactions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create table for AI model performance metrics
CREATE TABLE IF NOT EXISTS ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  avg_response_time_ms DOUBLE PRECISION,
  error_count INTEGER DEFAULT 0,
  success_rate DOUBLE PRECISION,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('ai_model_metrics', 'created_at', if_not_exists => TRUE);

-- Create continuous aggregate for hourly metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', created_at) AS hour,
  model_name,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  SUM(tokens_used) as total_tokens
FROM ai_interactions
WHERE response IS NOT NULL
GROUP BY hour, model_name
WITH NO DATA;

-- Add refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('ai_metrics_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Create table for embeddings cache
CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  model_version TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('embedding_cache', 'created_at', if_not_exists => TRUE);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embedding_cache_vector ON embedding_cache USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add retention policy to clean old embeddings (keep last 30 days)
SELECT add_retention_policy('embedding_cache', INTERVAL '30 days', if_not_exists => TRUE);

-- Create table for AI job queue (for pg-boss integration)
CREATE TABLE IF NOT EXISTS pgboss.job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  data JSONB,
  state TEXT NOT NULL DEFAULT 'created',
  retry_limit INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  retry_delay INTEGER NOT NULL DEFAULT 0,
  retry_backoff BOOLEAN NOT NULL DEFAULT false,
  start_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_on TIMESTAMPTZ,
  singleton_key TEXT,
  singleton_on TIMESTAMPTZ,
  expire_in INTERVAL NOT NULL DEFAULT INTERVAL '15 minutes',
  created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_on TIMESTAMPTZ,
  keep_until TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  output JSONB,
  dead_letter TEXT
);

-- Create schema for pg-boss if not exists
CREATE SCHEMA IF NOT EXISTS pgboss;

-- Create indexes for pgboss
CREATE INDEX IF NOT EXISTS job_state ON pgboss.job(state);
CREATE INDEX IF NOT EXISTS job_name ON pgboss.job(name);
CREATE INDEX IF NOT EXISTS job_priority_created_on ON pgboss.job(priority DESC, created_on ASC);
CREATE INDEX IF NOT EXISTS job_created_on ON pgboss.job(created_on);
CREATE INDEX IF NOT EXISTS job_singleton ON pgboss.job(singleton_key);
CREATE INDEX IF NOT EXISTS job_start_after ON pgboss.job(start_after);

-- Function to clean up old AI interaction data
CREATE OR REPLACE FUNCTION cleanup_old_ai_data()
RETURNS void AS $$
BEGIN
  -- Delete interactions older than 90 days
  DELETE FROM ai_interactions WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete metrics older than 180 days
  DELETE FROM ai_model_metrics WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup monthly
SELECT cron.schedule('cleanup-ai-data', '0 2 1 * *', 'SELECT cleanup_old_ai_data();');

-- Grant permissions on new tables
GRANT ALL ON ai_interactions TO web_anon;
GRANT ALL ON ai_model_metrics TO web_anon;
GRANT ALL ON embedding_cache TO web_anon;
GRANT ALL ON pgboss.job TO web_anon;
