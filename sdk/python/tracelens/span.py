import time
import uuid
from typing import Optional, Dict, Any
from .types import SpanConfig, SpanData


class Span:
    def __init__(self, config: SpanConfig):
        self.config = config
        self.attrs: Dict[str, Any] = {}
        self.start_time = time.time()
        self._ended = False
        self.data: Optional[SpanData] = None

    def set_attribute(self, key: str, value: Any) -> None:
        if self._ended:
            return
        self.attrs[key] = value

    def set_attributes(self, attrs: Dict[str, Any]) -> None:
        if self._ended:
            return
        self.attrs.update(attrs)

    def end(self, status: str = 'ok', error_message: Optional[str] = None) -> SpanData:
        if self._ended:
            raise RuntimeError('Span already ended')
        self._ended = True
        latency = int((time.time() - self.start_time) * 1000)

        self.data = SpanData(
            span_id=str(uuid.uuid4()),
            parent_id=self.config.parent_id,
            agent_type=self.config.agent,
            tool_name=self.config.task,
            llm_model=self.attrs.get('llm.model'),
            input_tokens=self.attrs.get('llm.input_tokens', 0),
            output_tokens=self.attrs.get('llm.output_tokens', 0),
            latency_ms=latency,
            status=status,
            error_message=error_message,
            cost_usd=self.attrs.get('cost.usd', 0.0),
            timestamp=time.strftime('%Y-%m-%dT%H:%M:%S.') + f'{int((time.time() % 1) * 1000):03d}Z',
            attributes=self.attrs,
        )
        return self.data

    def is_ended(self) -> bool:
        return self._ended
