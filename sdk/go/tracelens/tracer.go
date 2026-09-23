package tracelens

import "sync"

type TraceLens struct {
	config   Config
	batchers map[string]*Batcher
	mu       sync.RWMutex
}

func New(cfg Config) *TraceLens {
	if cfg.BufferMs == 0 {
		cfg.BufferMs = 100
	}
	if cfg.MaxBatchSize == 0 {
		cfg.MaxBatchSize = 100
	}
	return &TraceLens{
		config:   cfg,
		batchers: make(map[string]*Batcher),
	}
}

func (t *TraceLens) StartSpan(cfg SpanConfig) *Span {
	span := NewSpan(cfg)

	t.mu.Lock()
	batcher, exists := t.batchers[cfg.TraceID]
	if !exists {
		batcher = NewBatcher(t.config.Endpoint, t.config.APIKey, cfg.TraceID, t.config.BufferMs, t.config.MaxBatchSize)
		t.batchers[cfg.TraceID] = batcher
	}
	t.mu.Unlock()

	originalEnd := span.End
	span.End = func(endCfg EndConfig) (*SpanData, error) {
		data, err := originalEnd(endCfg)
		if err != nil {
			return nil, err
		}
		batcher.Add(*data)
		return data, nil
	}

	return span
}

func (t *TraceLens) Flush() {
	t.mu.RLock()
	batchers := make([]*Batcher, 0, len(t.batchers))
	for _, b := range t.batchers {
		batchers = append(batchers, b)
	}
	t.mu.RUnlock()

	for _, b := range batchers {
		b.Stop()
	}

	t.mu.Lock()
	t.batchers = make(map[string]*Batcher)
	t.mu.Unlock()
}
