-- Enable pgai extension
CREATE EXTENSION IF NOT EXISTS pgai CASCADE;

-- Create AI-enhanced functions for TimescaleDB

-- Function to get embeddings using pgai
CREATE OR REPLACE FUNCTION get_nvidia_embedding(input_text TEXT)
RETURNS vector(1536) AS $$
DECLARE
    embedding_result vector(1536);
BEGIN
    -- This function would use pgai to call NVIDIA API
    -- For now, returning a placeholder
    -- In production, this would integrate with pgai.openai_embed()
    SELECT pgai.openai_embed(
        'nvidia-embed-qa-4',
        input_text,
        api_key := current_setting('app.nvidia_api_key', true)
    ) INTO embedding_result;
    
    RETURN embedding_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return null vector on error
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function for semantic search with time filters
CREATE OR REPLACE FUNCTION search_ai_interactions(
    query_text TEXT,
    user_id_filter TEXT DEFAULT NULL,
    time_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    time_end TIMESTAMPTZ DEFAULT NOW(),
    limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    message TEXT,
    response TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH query_embedding AS (
        SELECT get_nvidia_embedding(query_text) AS embedding
    )
    SELECT 
        ai.id,
        ai.user_id,
        ai.message,
        ai.response,
        1 - (ai.embedding <=> qe.embedding) AS similarity,
        ai.created_at
    FROM ai_interactions ai
    CROSS JOIN query_embedding qe
    WHERE 
        ai.created_at BETWEEN time_start AND time_end
        AND (user_id_filter IS NULL OR ai.user_id = user_id_filter)
        AND ai.embedding IS NOT NULL
    ORDER BY ai.embedding <=> qe.embedding
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Create function for AI-powered analytics
CREATE OR REPLACE FUNCTION analyze_user_sentiment_over_time(
    p_user_id TEXT,
    p_interval INTERVAL DEFAULT INTERVAL '1 day'
)
RETURNS TABLE (
    time_bucket TIMESTAMPTZ,
    avg_sentiment FLOAT,
    message_count BIGINT,
    positive_count BIGINT,
    negative_count BIGINT,
    neutral_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        time_bucket(p_interval, created_at) AS time_bucket,
        AVG((metadata->>'sentiment_score')::FLOAT) AS avg_sentiment,
        COUNT(*) AS message_count,
        COUNT(*) FILTER (WHERE metadata->>'sentiment' = 'positive') AS positive_count,
        COUNT(*) FILTER (WHERE metadata->>'sentiment' = 'negative') AS negative_count,
        COUNT(*) FILTER (WHERE metadata->>'sentiment' = 'neutral') AS neutral_count
    FROM ai_interactions
    WHERE user_id = p_user_id
        AND metadata ? 'sentiment'
    GROUP BY time_bucket(p_interval, created_at)
    ORDER BY time_bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for RAG (Retrieval Augmented Generation)
CREATE OR REPLACE FUNCTION get_relevant_context(
    query_embedding vector(1536),
    context_limit INTEGER DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TEXT AS $$
DECLARE
    context_text TEXT := '';
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT 
            message,
            response,
            1 - (embedding <=> query_embedding) AS similarity
        FROM ai_interactions
        WHERE embedding IS NOT NULL
            AND 1 - (embedding <=> query_embedding) > similarity_threshold
        ORDER BY embedding <=> query_embedding
        LIMIT context_limit
    LOOP
        context_text := context_text || 
            E'\nUser: ' || rec.message || 
            E'\nAssistant: ' || rec.response || 
            E'\n---\n';
    END LOOP;
    
    RETURN context_text;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for user behavior patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS user_behavior_patterns AS
SELECT 
    user_id,
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS interaction_count,
    AVG(CASE 
        WHEN metadata->>'sentiment' = 'positive' THEN 1
        WHEN metadata->>'sentiment' = 'negative' THEN -1
        ELSE 0
    END) AS avg_sentiment,
    ARRAY_AGG(DISTINCT metadata->>'intent') AS intents,
    ARRAY_AGG(DISTINCT metadata->>'topic') AS topics
FROM ai_interactions
WHERE metadata IS NOT NULL
GROUP BY user_id, DATE_TRUNC('hour', created_at);

-- Create index on materialized view
CREATE INDEX idx_user_behavior_patterns_user_hour 
ON user_behavior_patterns(user_id, hour DESC);

-- Create function to predict user intent
CREATE OR REPLACE FUNCTION predict_user_intent(
    p_user_id TEXT,
    p_message TEXT
)
RETURNS JSONB AS $$
DECLARE
    user_history JSONB;
    predicted_intent TEXT;
    confidence FLOAT;
BEGIN
    -- Get user's recent interaction patterns
    SELECT jsonb_agg(
        jsonb_build_object(
            'intent', metadata->>'intent',
            'topic', metadata->>'topic',
            'sentiment', metadata->>'sentiment'
        )
    ) INTO user_history
    FROM (
        SELECT metadata
        FROM ai_interactions
        WHERE user_id = p_user_id
            AND metadata IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 20
    ) recent;
    
    -- Simple intent prediction based on patterns
    -- In production, this would use ML models via pgai
    SELECT 
        metadata->>'intent' AS intent,
        COUNT(*)::FLOAT / 20 AS confidence
    INTO predicted_intent, confidence
    FROM ai_interactions
    WHERE user_id = p_user_id
        AND metadata IS NOT NULL
    GROUP BY metadata->>'intent'
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    RETURN jsonb_build_object(
        'predicted_intent', COALESCE(predicted_intent, 'unknown'),
        'confidence', COALESCE(confidence, 0.0),
        'user_history', COALESCE(user_history, '[]'::jsonb),
        'message', p_message
    );
END;
$$ LANGUAGE plpgsql;

-- Create AI feedback learning table
CREATE TABLE IF NOT EXISTS ai_feedback_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id UUID REFERENCES ai_interactions(id),
    user_id TEXT NOT NULL,
    feedback_type TEXT CHECK (feedback_type IN ('helpful', 'unhelpful', 'correction')),
    feedback_value JSONB,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('ai_feedback_learning', 'created_at', if_not_exists => TRUE);

-- Function to apply feedback learning
CREATE OR REPLACE FUNCTION apply_feedback_learning()
RETURNS void AS $$
DECLARE
    feedback_rec RECORD;
BEGIN
    FOR feedback_rec IN
        SELECT * FROM ai_feedback_learning
        WHERE applied = FALSE
        ORDER BY created_at
    LOOP
        -- Update interaction metadata with feedback
        UPDATE ai_interactions
        SET metadata = metadata || jsonb_build_object(
            'feedback', feedback_rec.feedback_type,
            'feedback_value', feedback_rec.feedback_value,
            'feedback_applied_at', NOW()
        )
        WHERE id = feedback_rec.interaction_id;
        
        -- Mark feedback as applied
        UPDATE ai_feedback_learning
        SET applied = TRUE
        WHERE id = feedback_rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule feedback learning job
SELECT cron.schedule('apply-feedback-learning', '*/5 * * * *', 'SELECT apply_feedback_learning();');

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nvidia_embedding TO web_anon;
GRANT EXECUTE ON FUNCTION search_ai_interactions TO web_anon;
GRANT EXECUTE ON FUNCTION analyze_user_sentiment_over_time TO web_anon;
GRANT EXECUTE ON FUNCTION get_relevant_context TO web_anon;
GRANT EXECUTE ON FUNCTION predict_user_intent TO web_anon;
GRANT EXECUTE ON FUNCTION apply_feedback_learning TO web_anon;
GRANT ALL ON ai_feedback_learning TO web_anon;
