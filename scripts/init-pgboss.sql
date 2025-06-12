-- Create schema for pg-boss if not exists
CREATE SCHEMA IF NOT EXISTS pgboss;

-- Grant permissions to application user
GRANT ALL ON SCHEMA pgboss TO web_anon;

-- pg-boss will create its own tables when initialized
-- But we can create some custom tables for job analytics

-- Table for job execution metrics
CREATE TABLE IF NOT EXISTS pgboss.job_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    job_id UUID,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    input_size_bytes INTEGER,
    output_size_bytes INTEGER,
    memory_used_mb FLOAT,
    cpu_usage_percent FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('pgboss.job_metrics', 'created_at', if_not_exists => TRUE);

-- Create indexes
CREATE INDEX idx_job_metrics_name_created ON pgboss.job_metrics(job_name, created_at DESC);
CREATE INDEX idx_job_metrics_success ON pgboss.job_metrics(success, created_at DESC);

-- Create continuous aggregate for job performance
CREATE MATERIALIZED VIEW IF NOT EXISTS pgboss.job_performance_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', created_at) AS hour,
    job_name,
    COUNT(*) as execution_count,
    AVG(execution_time_ms) as avg_execution_time,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate,
    AVG(memory_used_mb) as avg_memory_mb,
    AVG(cpu_usage_percent) as avg_cpu_percent
FROM pgboss.job_metrics
GROUP BY hour, job_name
WITH NO DATA;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('pgboss.job_performance_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE
);

-- Create table for job dependencies
CREATE TABLE IF NOT EXISTS pgboss.job_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_job_id UUID NOT NULL,
    child_job_id UUID NOT NULL,
    dependency_type TEXT DEFAULT 'sequential',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_job_id, child_job_id)
);

-- Create table for job schedules
CREATE TABLE IF NOT EXISTS pgboss.job_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_name TEXT UNIQUE NOT NULL,
    job_name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    job_data JSONB DEFAULT '{}',
    options JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_job_schedules_active_next ON pgboss.job_schedules(active, next_run) WHERE active = TRUE;

-- Function to update job metrics
CREATE OR REPLACE FUNCTION pgboss.record_job_metric(
    p_job_name TEXT,
    p_job_id UUID,
    p_execution_time_ms INTEGER,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL,
    p_input_size INTEGER DEFAULT NULL,
    p_output_size INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO pgboss.job_metrics (
        job_name, job_id, execution_time_ms, success, 
        error_message, input_size_bytes, output_size_bytes
    ) VALUES (
        p_job_name, p_job_id, p_execution_time_ms, p_success,
        p_error_message, p_input_size, p_output_size
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get job performance stats
CREATE OR REPLACE FUNCTION pgboss.get_job_stats(
    p_job_name TEXT DEFAULT NULL,
    p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
    job_name TEXT,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    success_rate FLOAT,
    avg_execution_time_ms FLOAT,
    min_execution_time_ms INTEGER,
    max_execution_time_ms INTEGER,
    p95_execution_time_ms FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jm.job_name,
        COUNT(*) as total_executions,
        SUM(CASE WHEN jm.success THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN NOT jm.success THEN 1 ELSE 0 END) as failed_executions,
        AVG(CASE WHEN jm.success THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(jm.execution_time_ms) as avg_execution_time_ms,
        MIN(jm.execution_time_ms) as min_execution_time_ms,
        MAX(jm.execution_time_ms) as max_execution_time_ms,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY jm.execution_time_ms) as p95_execution_time_ms
    FROM pgboss.job_metrics jm
    WHERE 
        jm.created_at >= NOW() - p_time_range
        AND (p_job_name IS NULL OR jm.job_name = p_job_name)
    GROUP BY jm.job_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get job queue health
CREATE OR REPLACE FUNCTION pgboss.get_queue_health()
RETURNS JSONB AS $$
DECLARE
    health_status JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_pending', COUNT(*) FILTER (WHERE state = 'created'),
        'total_active', COUNT(*) FILTER (WHERE state = 'active'),
        'total_completed', COUNT(*) FILTER (WHERE state = 'completed'),
        'total_failed', COUNT(*) FILTER (WHERE state = 'failed'),
        'oldest_pending_minutes', 
            EXTRACT(EPOCH FROM (NOW() - MIN(created_on) FILTER (WHERE state = 'created'))) / 60,
        'jobs_by_name', (
            SELECT jsonb_object_agg(name, count)
            FROM (
                SELECT name, COUNT(*) as count
                FROM pgboss.job
                WHERE state IN ('created', 'active')
                GROUP BY name
            ) t
        )
    ) INTO health_status
    FROM pgboss.job;
    
    RETURN health_status;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA pgboss TO web_anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgboss TO web_anon;
GRANT USAGE ON SCHEMA pgboss TO web_anon;
