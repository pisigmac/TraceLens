from .types import SDKConfig, SpanConfig
from .span import Span
from .batcher import Batcher
import asyncio


class TraceLens:
    def __init__(self, endpoint: str, api_key: str, service: str, buffer_ms: int = 100, max_batch_size: int = 100):
        self.config = SDKConfig(
            endpoint=endpoint,
            api_key=api_key,
            service=service,
            buffer_ms=buffer_ms,
            max_batch_size=max_batch_size,
        )
        self._batchers: dict[str, Batcher] = {}

    def start_span(self, trace_id: str, agent: str, task: str, parent_id: str | None = None) -> Span:
        cfg = SpanConfig(trace_id=trace_id, agent=agent, task=task, parent_id=parent_id)
        span = Span(cfg)

        if trace_id not in self._batchers:
            self._batchers[trace_id] = Batcher(
                self.config.endpoint,
                self.config.api_key,
                trace_id,
                self.config.buffer_ms,
                self.config.max_batch_size,
            )
        batcher = self._batchers[trace_id]

        original_end = span.end
        def wrapped_end(status: str = 'ok', error_message: str | None = None):
            data = original_end(status, error_message)
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(batcher.add(data))
            except RuntimeError:
                batcher.add_sync(data)
            return data
        span.end = wrapped_end

        return span

    async def flush(self) -> None:
        await asyncio.gather(*(b.stop() for b in self._batchers.values()))
        self._batchers.clear()
