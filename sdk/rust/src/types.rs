use serde::Serialize;
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct SpanConfig {
    pub trace_id: String,
    pub parent_id: Option<String>,
    pub agent: String,
    pub task: String,
}

#[derive(Clone, Debug)]
pub struct EndConfig {
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Config {
    pub endpoint: String,
    pub api_key: String,
    pub service: String,
    pub buffer_ms: u64,
    pub max_batch_size: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            endpoint: String::new(),
            api_key: String::new(),
            service: String::new(),
            buffer_ms: 100,
            max_batch_size: 100,
        }
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct SpanData {
    pub span_id: String,
    pub parent_id: Option<String>,
    pub agent_type: String,
    pub tool_name: String,
    pub llm_model: Option<String>,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub latency_ms: u64,
    pub status: String,
    pub error_message: Option<String>,
    pub cost_usd: f64,
    pub timestamp: String,
    pub attributes: HashMap<String, serde_json::Value>,
}
