#[cfg(test)]
mod tests {
    use tracelens::{TraceLens, SpanConfig, EndConfig};

    #[tokio::test]
    async fn test_create_and_end_span() {
        let tl = TraceLens::new(tracelens::Config {
            endpoint: "http://localhost:8080".to_string(),
            api_key: "test-key".to_string(),
            service: "test-service".to_string(),
            ..Default::default()
        });

        let mut span = tl.start_span(SpanConfig {
            trace_id: "trace-001".to_string(),
            parent_id: None,
            agent: "cursor".to_string(),
            task: "refactor".to_string(),
        }).await;

        span.set_attribute("llm.model", serde_json::json!("claude-3-5-sonnet"));
        span.set_attribute("llm.input_tokens", serde_json::json!(4200));
        span.set_attribute("cost.usd", serde_json::json!(0.12));

        let data = span.end(EndConfig {
            status: "ok".to_string(),
            error_message: None,
        }).unwrap();

        assert_eq!(data.agent_type, "cursor");
        assert_eq!(data.tool_name, "refactor");
        assert_eq!(data.llm_model, Some("claude-3-5-sonnet".to_string()));
        assert_eq!(data.input_tokens, 4200);
        assert_eq!(data.cost_usd, 0.12);
        assert_eq!(data.status, "ok");
        assert!(data.latency_ms >= 0);
    }
}
