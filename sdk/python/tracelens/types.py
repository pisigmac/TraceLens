from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class SpanConfig:
    trace_id: str
    agent: str
    task: str
    parent_id: Optional[str] = None


@dataclass
class SDKConfig:
    endpoint: str
    api_key: str
    service: str
    buffer_ms: int = 100
    max_batch_size: int = 100


@dataclass
class SpanData:
    span_id: str
    parent_id: Optional[str]
    agent_type: str
    tool_name: str
    llm_model: Optional[str]
    input_tokens: int
    output_tokens: int
    latency_ms: int
    status: str
    error_message: Optional[str]
    cost_usd: float
    timestamp: str
    attributes: Dict[str, Any] = field(default_factory=dict)
