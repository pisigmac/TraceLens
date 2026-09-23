import pytest
from uuid import uuid4
from unittest.mock import MagicMock
from tracelens import TraceLens, TraceLensLangChainHandler, TraceLensLlamaIndexHandler


@pytest.fixture
def tl():
    return TraceLens(
        endpoint='http://localhost:8080',
        api_key='test-key',
        service='test-service',
    )


def test_langchain_handler_events(tl):
    handler = TraceLensLangChainHandler(
        tracer=tl,
        trace_id="py-lc-001",
        agent_name="python-langchain",
    )

    run_id_1 = uuid4()
    run_id_2 = uuid4()

    handler.on_chain_start({"name": "test_chain"}, {"input": "hello"}, run_id=run_id_1)
    handler.on_llm_start({"name": "gpt-4o"}, ["Prompt text"], run_id=run_id_2, parent_run_id=run_id_1)

    mock_llm_res = MagicMock()
    mock_llm_res.llm_output = {"token_usage": {"prompt_tokens": 120, "completion_tokens": 45}}
    mock_llm_res.generations = [[MagicMock(text="Completion response")]]

    handler.on_llm_end(mock_llm_res, run_id=run_id_2)
    handler.on_chain_end({"output": "success"}, run_id=run_id_1)


def test_langchain_handler_errors(tl):
    handler = TraceLensLangChainHandler(
        tracer=tl,
        trace_id="py-lc-err",
    )
    run_id = uuid4()

    handler.on_tool_start({"name": "db_lookup"}, "select *", run_id=run_id)
    handler.on_tool_error(RuntimeError("DB query failed"), run_id=run_id)


def test_llamaindex_handler_events(tl):
    handler = TraceLensLlamaIndexHandler(
        tracer=tl,
        trace_id="py-llama-001",
    )

    handler.on_retrieve_start("rag query", "ev-1")
    handler.on_retrieve_end([{"node": 1}], "ev-1")

    handler.on_query_start("full query", "ev-2")
    handler.on_query_end("answer", "ev-2")
