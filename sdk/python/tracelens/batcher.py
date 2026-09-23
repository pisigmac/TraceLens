import asyncio
import httpx
from typing import List, Dict, Any
from .types import SpanData


class Batcher:
    def __init__(self, endpoint: str, api_key: str, trace_id: str, buffer_ms: int = 100, max_batch_size: int = 100):
        self.endpoint = endpoint
        self.api_key = api_key
        self.trace_id = trace_id
        self.buffer_ms = buffer_ms
        self.max_batch_size = max_batch_size
        self._buffer: List[SpanData] = []
        self._client = httpx.AsyncClient(timeout=10.0)
        self._lock = asyncio.Lock()
        try:
            self._task = asyncio.create_task(self._loop())
        except RuntimeError:
            self._task = None

    def add_sync(self, span: SpanData) -> None:
        self._buffer.append(span)

    async def add(self, span: SpanData) -> None:
        async with self._lock:
            self._buffer.append(span)
            if len(self._buffer) >= self.max_batch_size:
                await self._flush()

    async def _loop(self) -> None:
        while self._running:
            await asyncio.sleep(self.buffer_ms / 1000)
            async with self._lock:
                await self._flush()

    async def _flush(self) -> None:
        if not self._buffer:
            return
        batch = self._buffer
        self._buffer = []
        payload = {
            'trace_id': self.trace_id,
            'spans': [
                {
                    'span_id': s.span_id,
                    'parent_id': s.parent_id,
                    'agent_type': s.agent_type,
                    'tool_name': s.tool_name,
                    'llm_model': s.llm_model,
                    'input_tokens': s.input_tokens,
                    'output_tokens': s.output_tokens,
                    'latency_ms': s.latency_ms,
                    'status': s.status,
                    'error_message': s.error_message,
                    'cost_usd': s.cost_usd,
                    'timestamp': s.timestamp,
                    'attributes': s.attributes,
                }
                for s in batch
            ],
        }
        try:
            resp = await self._client.post(
                f'{self.endpoint}/v1/spans',
                headers={'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'},
                json=payload,
            )
            if resp.status_code != 201:
                print(f'TraceLens ingest failed: {resp.status_code}')
        except Exception as e:
            print(f'TraceLens flush error: {e}')

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        async with self._lock:
            await self._flush()
        await self._client.aclose()
