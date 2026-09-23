package tracelens

type SpanConfig struct {
	TraceID  string
	ParentID *string
	Agent    string
	Task     string
}

type EndConfig struct {
	Status       string
	ErrorMessage *string
}

type Config struct {
	Endpoint      string
	APIKey        string
	Service       string
	BufferMs      int
	MaxBatchSize  int
}

type SpanData struct {
	SpanID        string                 `json:"span_id"`
	ParentID      *string                `json:"parent_id"`
	AgentType     string                 `json:"agent_type"`
	ToolName      string                 `json:"tool_name"`
	LLMModel      *string                `json:"llm_model"`
	InputTokens   int                    `json:"input_tokens"`
	OutputTokens  int                    `json:"output_tokens"`
	LatencyMs     int64                  `json:"latency_ms"`
	Status        string                 `json:"status"`
	ErrorMessage  *string                `json:"error_message"`
	CostUSD       float64                `json:"cost_usd"`
	Timestamp     string                 `json:"timestamp"`
	Attributes    map[string]interface{} `json:"attributes"`
}
