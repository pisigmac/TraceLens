import time
import json
from typing import Any, Dict, List, Optional, Union
from uuid import UUID
from tracelens.tracer import TraceLens
from tracelens.span import Span

class TraceLensLangChainHandler:
    """
    LangChain & LangGraph Callback Handler for TraceLens.
    Captures chains, LLM calls, and tool executions, measuring latencies, token burn, and errors.
    """

    def __init__(
        self,
        tracer: TraceLens,
        trace_id: Optional[str] = None,
        agent_name: str = "langchain-agent",
    ):
        self.tracer = tracer
        self.default_trace_id = trace_id or f"langchain-{int(time.time() * 1000)}"
        self.agent_name = agent_name
        self.active_spans: Dict[str, Dict[str, Any]] = {}

    def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        parent_key = str(parent_run_id) if parent_run_id else None
        parent_span_id = self.active_spans.get(parent_key, {}).get("span_id") if parent_key else None

        task_name = serialized.get("name") or serialized.get("id", ["chain"])[-1] if serialized else "chain_execution"

        span = self.tracer.start_span(
            trace_id=self.default_trace_id,
            agent=self.agent_name,
            task=task_name,
            parent_id=parent_span_id,
        )

        span.set_attribute("inputs", json.dumps(inputs)[:1000] if inputs else None)
        span.set_attribute("framework", "langchain")

        self.active_spans[run_key] = {"span": span, "span_id": getattr(span, "span_id", run_key)}

    def on_chain_end(
        self,
        outputs: Dict[str, Any],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        item = self.active_spans.pop(run_key, None)
        if not item:
            return

        span: Span = item["span"]
        span.set_attribute("outputs", json.dumps(outputs)[:1000] if outputs else None)
        span.end(status="ok")

    def on_chain_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        item = self.active_spans.pop(run_key, None)
        if not item:
            return

        span: Span = item["span"]
        span.end(status="error", error_message=str(error))

    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        parent_key = str(parent_run_id) if parent_run_id else None
        parent_span_id = self.active_spans.get(parent_key, {}).get("span_id") if parent_key else None

        model_name = serialized.get("name") or "llm" if serialized else "llm"

        span = self.tracer.start_span(
            trace_id=self.default_trace_id,
            agent=self.agent_name,
            task=f"llm_inference:{model_name}",
            parent_id=parent_span_id,
        )

        span.set_attribute("llm.model", model_name)
        span.set_attribute("prompt", "\n".join(prompts)[:1000] if prompts else "")
        span.set_attribute("framework", "langchain")

        self.active_spans[run_key] = {"span": span, "span_id": getattr(span, "span_id", run_key)}

    def on_llm_end(
        self,
        response: Any,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        item = self.active_spans.pop(run_key, None)
        if not item:
            return

        span: Span = item["span"]

        llm_output = getattr(response, "llm_output", {}) or {}
        token_usage = llm_output.get("token_usage") or llm_output.get("tokenUsage") or {}

        if token_usage:
            prompt_tokens = token_usage.get("prompt_tokens") or token_usage.get("promptTokens") or 0
            completion_tokens = token_usage.get("completion_tokens") or token_usage.get("completionTokens") or 0

            span.set_attribute("llm.input_tokens", prompt_tokens)
            span.set_attribute("llm.output_tokens", completion_tokens)

            cost = (prompt_tokens * 0.000003) + (completion_tokens * 0.000015)
            span.set_attribute("cost.usd", round(cost, 6))

        generations = getattr(response, "generations", [])
        if generations and len(generations) > 0 and len(generations[0]) > 0:
            gen_text = getattr(generations[0][0], "text", str(generations[0][0]))
            span.set_attribute("response", gen_text[:1000])

        span.end(status="ok")

    def on_llm_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        item = self.active_spans.pop(run_key, None)
        if not item:
            return

        span: Span = item["span"]
        span.end(status="error", error_message=str(error))

    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        parent_key = str(parent_run_id) if parent_run_id else None
        parent_span_id = self.active_spans.get(parent_key, {}).get("span_id") if parent_key else None

        tool_name = serialized.get("name") if serialized else "tool_execution"

        span = self.tracer.start_span(
            trace_id=self.default_trace_id,
            agent=self.agent_name,
            task=tool_name,
            parent_id=parent_span_id,
        )

        span.set_attribute("tool_input", str(input_str)[:1000])
        span.set_attribute("framework", "langchain")

        self.active_spans[run_key] = {"span": span, "span_id": getattr(span, "span_id", run_key)}

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        item = self.active_spans.pop(run_key, None)
        if not item:
            return

        span: Span = item["span"]
        span.set_attribute("tool_output", str(output)[:1000])
        span.end(status="ok")

    def on_tool_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        run_key = str(run_id)
        item = self.active_spans.pop(run_key, None)
        if not item:
            return

        span: Span = item["span"]
        span.end(status="error", error_message=str(error))
