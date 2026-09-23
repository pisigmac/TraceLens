package tracelens

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type Batcher struct {
	endpoint     string
	apiKey       string
	traceID      string
	buffer       []SpanData
	mu           sync.Mutex
	ticker       *time.Ticker
	maxBatchSize int
	client       *http.Client
}

func NewBatcher(endpoint, apiKey, traceID string, bufferMs, maxBatchSize int) *Batcher {
	b := &Batcher{
		endpoint:     endpoint,
		apiKey:       apiKey,
		traceID:      traceID,
		buffer:       make([]SpanData, 0, maxBatchSize),
		ticker:       time.NewTicker(time.Duration(bufferMs) * time.Millisecond),
		maxBatchSize: maxBatchSize,
		client:       &http.Client{Timeout: 10 * time.Second},
	}
	go b.loop()
	return b
}

func (b *Batcher) Add(span SpanData) {
	b.mu.Lock()
	b.buffer = append(b.buffer, span)
	shouldFlush := len(b.buffer) >= b.maxBatchSize
	b.mu.Unlock()

	if shouldFlush {
		b.Flush()
	}
}

func (b *Batcher) loop() {
	for range b.ticker.C {
		b.Flush()
	}
}

func (b *Batcher) Flush() {
	b.mu.Lock()
	if len(b.buffer) == 0 {
		b.mu.Unlock()
		return
	}
	batch := make([]SpanData, len(b.buffer))
	copy(batch, b.buffer)
	b.buffer = b.buffer[:0]
	b.mu.Unlock()

	payload := map[string]interface{}{
		"trace_id": b.traceID,
		"spans":    batch,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		fmt.Printf("marshal error: %v\n", err)
		return
	}

	req, err := http.NewRequest("POST", b.endpoint+"/v1/spans", bytes.NewBuffer(body))
	if err != nil {
		fmt.Printf("request error: %v\n", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+b.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.client.Do(req)
	if err != nil {
		fmt.Printf("flush error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 {
		fmt.Printf("ingest failed: %d\n", resp.StatusCode)
	}
}

func (b *Batcher) Stop() {
	b.ticker.Stop()
	b.Flush()
}
