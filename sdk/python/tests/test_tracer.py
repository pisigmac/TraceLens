import pytest
import asyncio
from tracelens import TraceLens


@pytest.fixture
def tl():
    return TraceLens(
        endpoint='http://localhost:8080',
        api_key='test-key',
        service='test-service',
    )


def test_create_and_end_span(tl):
    span = tl.start_span(trace_id='trace-001', agent='cursor', task='refactor')
    span.set_attribute('llm.model', 'claude-3-5-sonnet')
    span.set_attribute('llm.input_tokens', 4200)
    span.set_attribute('cost.usd', 0.12)
    data = span.end(status='ok')

    assert data.agent_type == 'cursor'
    assert data.tool_name == 'refactor'
    assert data.llm_model == 'claude-3-5-sonnet'
    assert data.input_tokens == 4200
    assert data.cost_usd == 0.12
    assert data.status == 'ok'
    assert data.latency_ms >= 0


def test_span_cannot_end_twice(tl):
    span = tl.start_span(trace_id='trace-002', agent='browser', task='verify')
    span.end(status='ok')
    with pytest.raises(RuntimeError, match='Span already ended'):
        span.end(status='ok')


def test_parent_id_propagation(tl):
    parent = tl.start_span(trace_id='trace-003', agent='cursor', task='edit')
    parent_data = parent.end(status='ok')

    child = tl.start_span(trace_id='trace-003', agent='browser', task='verify', parent_id=parent_data.span_id)
    child_data = child.end(status='ok')
    assert child_data.parent_id == parent_data.span_id
