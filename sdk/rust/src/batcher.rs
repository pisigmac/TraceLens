use crate::types::SpanData;
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

pub struct Batcher {
    endpoint: String,
    api_key: String,
    trace_id: String,
    buffer: Arc<Mutex<Vec<SpanData>>>,
    client: Client,
    max_batch_size: usize,
}

impl Batcher {
    pub fn new(endpoint: String, api_key: String, trace_id: String, buffer_ms: u64, max_batch_size: usize) -> Arc<Self> {
        let batcher = Arc::new(Self {
            endpoint,
            api_key,
            trace_id,
            buffer: Arc::new(Mutex::new(Vec::new())),
            client: Client::new(),
            max_batch_size,
        });

        let b = batcher.clone();
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_millis(buffer_ms));
            loop {
                ticker.tick().await;
                let _ = b.flush().await;
            }
        });

        batcher
    }

    pub async fn add(&self, span: SpanData) {
        let mut buf = self.buffer.lock().await;
        buf.push(span);
        let should_flush = buf.len() >= self.max_batch_size;
        drop(buf);
        if should_flush {
            let _ = self.flush().await;
        }
    }

    pub async fn flush(&self) -> Result<(), reqwest::Error> {
        let mut buf = self.buffer.lock().await;
        if buf.is_empty() {
            return Ok(());
        }
        let batch = std::mem::take(&mut *buf);
        drop(buf);

        let payload = json!({
            "trace_id": self.trace_id,
            "spans": batch,
        });

        self.client
            .post(format!("{}/v1/spans", self.endpoint))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        Ok(())
    }

    pub async fn stop(&self) {
        let _ = self.flush().await;
    }
}
