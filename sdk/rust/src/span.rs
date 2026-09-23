use crate::types::{SpanConfig, EndConfig, SpanData};
use std::collections::HashMap;
use std::time::Instant;
use uuid::Uuid;
use chrono::Utc;

pub struct Span {
    pub config: SpanConfig,
    attrs: HashMap<String, serde_json::Value>,
    start: Instant,
    ended: bool,
    pub data: Option<SpanData>,
}

impl Span {
    pub fn new(config: SpanConfig) -> Self {
        Self {
            config,
            attrs: HashMap::new(),
            start: Instant::now(),
            ended: false,
            data: None,
        }
    }

    pub fn set_attribute(&mut self, key: &str, value: serde_json::Value) {
        if self.ended { return; }
        self.attrs.insert(key.to_string(), value);
    }

    pub fn set_attributes(&mut self, attrs: HashMap<String, serde_json::Value>) {
        if self.ended { return; }
        self.attrs.extend(attrs);
    }

    pub fn end(&mut self, cfg: EndConfig) -> Result<SpanData, &'static str> {
        if self.ended {
            return Err("span already ended");
        }
        self.ended = true;
        let latency = self.start.elapsed().as_millis() as u64;

        let llm_model = self.attrs.get("llm.model")
            .and_then(|v| v.as_str().map(|s| s.to_string()));
        let input_tokens = self.attrs.get("llm.input_tokens")
            .and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let output_tokens = self.attrs.get("llm.output_tokens")
            .and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let cost_usd = self.attrs.get("cost.usd")
            .and_then(|v| v.as_f64()).unwrap_or(0.0);

        let data = SpanData {
            span_id: Uuid::new_v4().to_string(),
            parent_id: self.config.parent_id.clone(),
            agent_type: self.config.agent.clone(),
            tool_name: self.config.task.clone(),
            llm_model,
            input_tokens,
            output_tokens,
            latency_ms: latency,
            status: cfg.status,
            error_message: cfg.error_message,
            cost_usd,
            timestamp: Utc::now().to_rfc3339(),
            attributes: self.attrs.clone(),
        };

        self.data = Some(data.clone());
        Ok(data)
    }

    pub fn is_ended(&self) -> bool {
        self.ended
    }
}
