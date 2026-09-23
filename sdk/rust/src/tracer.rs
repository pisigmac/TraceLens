use crate::types::{Config, SpanConfig};
use crate::span::Span;
use crate::batcher::Batcher;
use std::collections::HashMap;
use std::sync::Arc;

pub struct TraceLens {
    config: Config,
    batchers: Arc<tokio::sync::Mutex<HashMap<String, Arc<Batcher>>>>,
}

impl TraceLens {
    pub fn new(config: Config) -> Self {
        Self {
            config,
            batchers: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
        }
    }

    pub async fn start_span(&self, config: SpanConfig) -> Span {
        let mut span = Span::new(config.clone());
        let mut batchers = self.batchers.lock().await;

        let batcher = batchers.entry(config.trace_id.clone()).or_insert_with(|| {
            Batcher::new(
                self.config.endpoint.clone(),
                self.config.api_key.clone(),
                config.trace_id.clone(),
                self.config.buffer_ms,
                self.config.max_batch_size,
            )
        }).clone();

        drop(batchers);

        // Note: In production, use a callback or channel pattern.
        // Simplified here for the example.
        span
    }

    pub async fn flush(&self) {
        let batchers = self.batchers.lock().await;
        for b in batchers.values() {
            b.stop().await;
        }
    }
}
