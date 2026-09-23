import time
from typing import Any, Dict, List, Optional
from tracelens.tracer import TraceLens
from tracelens.span import Span

class TraceLensLlamaIndexHandler:
    """
    LlamaIndex Callback Handler for TraceLens.
    Captures vector search, chunk retrieval, and RAG query execution.
    """

    def __init__(self, tracer: TraceLens, trace_id: Optional[str] = None):
        self.tracer = tracer
        self.default_trace_id = trace_id or f"llamaindex-{int(time.time() * 1000)}"
        self.active_events: Dict[str, Span] = {}

    def on_retrieve_start(self, query: str, event_id: str) -> None:
        span = self.tracer.start_span(
            trace_id=self.default_trace_id,
            agent="llamaindex",
            task="vector_retrieval",
        )
        span.set_attribute("query", query)
        span.set_attribute("framework", "llamaindex")
        self.active_events[event_id] = span

    def on_retrieve_end(self, nodes: List[Any], event_id: str) -> None:
        span = self.active_events.pop(event_id, None)
        if not span:
            return

        span.set_attribute("retrieved_chunks_count", len(nodes) if nodes else 0)
        span.end(status="ok")

    def on_query_start(self, query: str, event_id: str) -> None:
        span = self.tracer.start_span(
            trace_id=self.default_trace_id,
            agent="llamaindex",
            task="rag_query_execution",
        )
        span.set_attribute("query", query)
        span.set_attribute("framework", "llamaindex")
        self.active_events[event_id] = span

    def on_query_end(self, response: Any, event_id: str) -> None:
        span = self.active_events.pop(event_id, None)
        if not span:
            return

        span.set_attribute("response", str(response)[:1000])
        span.end(status="ok")
