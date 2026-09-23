package tracelens

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Span struct {
	config    SpanConfig
	attrs     map[string]interface{}
	start     time.Time
	ended     bool
	Data      *SpanData
}

func NewSpan(config SpanConfig) *Span {
	return &Span{
		config: config,
		attrs:  make(map[string]interface{}),
		start:  time.Now(),
	}
}

func (s *Span) SetAttribute(key string, value interface{}) {
	if s.ended {
		return
	}
	s.attrs[key] = value
}

func (s *Span) SetAttributes(attrs map[string]interface{}) {
	if s.ended {
		return
	}
	for k, v := range attrs {
		s.attrs[k] = v
	}
}

func (s *Span) End(cfg EndConfig) (*SpanData, error) {
	if s.ended {
		return nil, fmt.Errorf("span already ended")
	}
	s.ended = true
	latency := time.Since(s.start).Milliseconds()

	llmModel, _ := s.attrs["llm.model"].(string)
	inputTokens, _ := s.attrs["llm.input_tokens"].(int)
	if inputTokens == 0 {
		inputTokens = 0
	}
	outputTokens, _ := s.attrs["llm.output_tokens"].(int)
	costUSD, _ := s.attrs["cost.usd"].(float64)

	s.Data = &SpanData{
		SpanID:       uuid.New().String(),
		ParentID:     s.config.ParentID,
		AgentType:    s.config.Agent,
		ToolName:     s.config.Task,
		LLMModel:     &llmModel,
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		LatencyMs:    latency,
		Status:       cfg.Status,
		CostUSD:      costUSD,
		Timestamp:    time.Now().UTC().Format(time.RFC3339Nano),
		Attributes:   s.attrs,
	}

	if cfg.ErrorMessage != nil {
		s.Data.ErrorMessage = cfg.ErrorMessage
	}

	return s.Data, nil
}

func (s *Span) IsEnded() bool {
	return s.ended
}
