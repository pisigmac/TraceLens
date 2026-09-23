package tracelens

import (
	"testing"
)

func TestCreateAndEndSpan(t *testing.T) {
	tl := New(Config{
		Endpoint: "http://localhost:8080",
		APIKey:   "test-key",
		Service:  "test-service",
	})

	span := tl.StartSpan(SpanConfig{TraceID: "trace-001", Agent: "cursor", Task: "refactor"})
	span.SetAttribute("llm.model", "claude-3-5-sonnet")
	span.SetAttribute("llm.input_tokens", 4200)
	span.SetAttribute("cost.usd", 0.12)
	data, err := span.End(EndConfig{Status: "ok"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if data.AgentType != "cursor" {
		t.Errorf("expected agent_type cursor, got %s", data.AgentType)
	}
	if data.ToolName != "refactor" {
		t.Errorf("expected tool_name refactor, got %s", data.ToolName)
	}
	if data.CostUSD != 0.12 {
		t.Errorf("expected cost 0.12, got %f", data.CostUSD)
	}
	if data.Status != "ok" {
		t.Errorf("expected status ok, got %s", data.Status)
	}
	if data.LatencyMs < 0 {
		t.Errorf("latency should be >= 0")
	}
}

func TestSpanCannotEndTwice(t *testing.T) {
	tl := New(Config{Endpoint: "http://localhost:8080", APIKey: "test", Service: "test"})
	span := tl.StartSpan(SpanConfig{TraceID: "trace-002", Agent: "browser", Task: "verify"})
	span.End(EndConfig{Status: "ok"})
	_, err := span.End(EndConfig{Status: "ok"})
	if err == nil {
		t.Error("expected error on second end")
	}
}

func TestParentIDPropagation(t *testing.T) {
	tl := New(Config{Endpoint: "http://localhost:8080", APIKey: "test", Service: "test"})
	parent := tl.StartSpan(SpanConfig{TraceID: "trace-003", Agent: "cursor", Task: "edit"})
	parentData, _ := parent.End(EndConfig{Status: "ok"})

	child := tl.StartSpan(SpanConfig{TraceID: "trace-003", ParentID: &parentData.SpanID, Agent: "browser", Task: "verify"})
	childData, _ := child.End(EndConfig{Status: "ok"})

	if childData.ParentID == nil || *childData.ParentID != parentData.SpanID {
		t.Error("parent_id not propagated correctly")
	}
}
