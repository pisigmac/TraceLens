#!/usr/bin/env bash
set -e

# Base URL for the TraceLens collector service
BASE_URL=${BASE_URL:-"http://localhost:8080"}
JWT_SECRET=${JWT_SECRET:-"dev-secret-change-in-production"}

echo "=========================================================="
echo "  TraceLens End-to-End API Test Suite (curl)"
echo "=========================================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASSED_TESTS=0
FAILED_TESTS=0

assert_status() {
  local test_name="$1"
  local expected_status="$2"
  local actual_status="$3"
  local response_body="$4"

  if [ "$actual_status" -eq "$expected_status" ]; then
    echo -e "  [${GREEN}PASS${NC}] $test_name (HTTP $actual_status)"
    PASSED_TESTS=$((PASSED_TESTS+1))
  else
    echo -e "  [${RED}FAIL${NC}] $test_name (Expected HTTP $expected_status, got $actual_status)"
    echo "         Response: $response_body"
    FAILED_TESTS=$((FAILED_TESTS+1))
  fi
}

# 1. Generate JWT Token
echo "1. Generating JWT Token..."
TOKEN=$(node -e "const jwt = require('/home/oh20210736-ud/Documents/WorkSpace/tracelens/collector/node_modules/jsonwebtoken'); console.log(jwt.sign({ sub: 'e2e-tester', api_key: 'test-key-123', tier: 'enterprise' }, '$JWT_SECRET', { issuer: 'tracelens', audience: 'tracelens-api' }))")
if [ -z "$TOKEN" ]; then
  echo "Failed to generate token"
  exit 1
fi
echo "   Token generated successfully."
echo ""

echo "2. Running API Endpoints Tests..."

# Test 1: GET /health
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /health" 200 "$STATUS" "$BODY"

# Test 2: GET /metrics (Prometheus)
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/metrics")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /metrics (Prometheus)" 200 "$STATUS" "$BODY"

# Test 3: Unauthorized Request (Missing Token)
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/spans" -H "Content-Type: application/json" -d '{}')
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "POST /v1/spans without Auth header" 401 "$STATUS" "$BODY"

# Test 4: Unauthorized Request (Invalid Token)
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/traces/test-trace-001" -H "Authorization: Bearer invalid-token")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/traces/id with invalid token" 401 "$STATUS" "$BODY"

# Test 5: Invalid Payload Schema
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/spans" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid_field": true}')
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "POST /v1/spans invalid schema" 400 "$STATUS" "$BODY"

# Test 6: Ingest Valid Spans (Trace 1 - OK status)
TRACE_1_ID="e2e-trace-ok-$(date +%s)"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/spans" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"trace_id\": \"$TRACE_1_ID\",
    \"spans\": [
      {
        \"span_id\": \"span-101\",
        \"parent_id\": null,
        \"agent_type\": \"cursor\",
        \"tool_name\": \"code_completion\",
        \"llm_model\": \"claude-3-5-sonnet\",
        \"input_tokens\": 1500,
        \"output_tokens\": 400,
        \"latency_ms\": 650,
        \"status\": \"ok\",
        \"cost_usd\": 0.045,
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
        \"attributes\": {
          \"prompt\": \"Write unit tests for authentication module\",
          \"response\": \"Unit test code implementation...\",
          \"decision\": \"approved\"
        }
      },
      {
        \"span_id\": \"span-102\",
        \"parent_id\": \"span-101\",
        \"agent_type\": \"cursor\",
        \"tool_name\": \"test_runner\",
        \"llm_model\": \"claude-3-5-sonnet\",
        \"input_tokens\": 800,
        \"output_tokens\": 150,
        \"latency_ms\": 320,
        \"status\": \"ok\",
        \"cost_usd\": 0.015,
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
        \"attributes\": {
          \"prompt\": \"Execute Jest test suite\",
          \"tool_output\": \"Test Suites: 5 passed, 5 total\",
          \"decision\": \"passed\"
        }
      }
    ]
  }")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "POST /v1/spans (Ingest Trace 1 OK)" 201 "$STATUS" "$BODY"

# Test 7: Ingest Spans with Error/Anomalies (Trace 2)
TRACE_2_ID="e2e-trace-err-$(date +%s)"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/spans" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"trace_id\": \"$TRACE_2_ID\",
    \"spans\": [
      {
        \"span_id\": \"span-201\",
        \"parent_id\": null,
        \"agent_type\": \"autodev\",
        \"tool_name\": \"deploy_service\",
        \"llm_model\": \"gpt-4o\",
        \"input_tokens\": 3200,
        \"output_tokens\": 900,
        \"latency_ms\": 12500,
        \"status\": \"error\",
        \"error_message\": \"Connection timed out connecting to Kubernetes cluster\",
        \"cost_usd\": 1.25,
        \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
        \"attributes\": {
          \"prompt\": \"Deploy container to production\",
          \"tool_output\": \"ERROR: ETIMEDOUT 10.0.0.1:6443\"
        }
      }
    ]
  }")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "POST /v1/spans (Ingest Trace 2 Error)" 201 "$STATUS" "$BODY"

# Test 7.5: OTLP/HTTP Standard OpenTelemetry Export Ingestion
TRACE_3_ID="otlp-trace-$(date +%s)"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/traces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"resourceSpans\": [
      {
        \"resource\": {
          \"attributes\": [
            { \"key\": \"service.name\", \"value\": { \"stringValue\": \"otlp-agent\" } }
          ]
        },
        \"scopeSpans\": [
          {
            \"spans\": [
              {
                \"traceId\": \"$TRACE_3_ID\",
                \"spanId\": \"otlp-span-101\",
                \"name\": \"otlp_tool_exec\",
                \"startTimeUnixNano\": \"1785671655000000000\",
                \"endTimeUnixNano\": \"1785671655800000000\",
                \"attributes\": [
                  { \"key\": \"agent.type\", \"value\": { \"stringValue\": \"otlp_agent\" } },
                  { \"key\": \"llm.model\", \"value\": { \"stringValue\": \"claude-3-5-sonnet\" } },
                  { \"key\": \"llm.usage.prompt_tokens\", \"value\": { \"intValue\": 1200 } },
                  { \"key\": \"llm.cost_usd\", \"value\": { \"doubleValue\": 0.04 } }
                ],
                \"status\": { \"code\": 1 }
              }
            ]
          }
        ]
      }
    ]
  }")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "POST /v1/traces (OTLP/HTTP Standard Ingestion)" 201 "$STATUS" "$BODY"

# Test 8: Get Trace by ID
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/traces/$TRACE_1_ID" -H "Authorization: Bearer $TOKEN")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/traces/:trace_id" 200 "$STATUS" "$BODY"

# Test 9: Get Non-Existent Trace ID
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/traces/non-existent-999" -H "Authorization: Bearer $TOKEN")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/traces/:trace_id non-existent" 404 "$STATUS" "$BODY"

# Test 10: Search Traces
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/traces/search?agent_type=cursor" -H "Authorization: Bearer $TOKEN")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/traces/search?agent_type=cursor" 200 "$STATUS" "$BODY"

# Test 11: Trace Replay
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/traces/$TRACE_1_ID/replay" -H "Authorization: Bearer $TOKEN")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/traces/:trace_id/replay" 200 "$STATUS" "$BODY"

# Test 12: Analyze Trace for Anomalies
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/traces/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"trace_id\": \"$TRACE_2_ID\"}")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "POST /v1/traces/analyze" 200 "$STATUS" "$BODY"

# Test 13: Get Aggregated Metrics
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/metrics" -H "Authorization: Bearer $TOKEN")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/metrics" 200 "$STATUS" "$BODY"

# Test 14: Get Agent Performance
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/agents/cursor/performance" -H "Authorization: Bearer $TOKEN")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/agents/cursor/performance" 200 "$STATUS" "$BODY"

# Test 15: Get Performance for Non-Existent Agent
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/agents/unknown-agent/performance" -H "Authorization: Bearer $TOKEN")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n 1)
assert_status "GET /v1/agents/unknown/performance" 404 "$STATUS" "$BODY"

echo ""
echo "=========================================================="
echo "  Test Summary"
echo "=========================================================="
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"
echo "=========================================================="

if [ "$FAILED_TESTS" -gt 0 ]; then
  exit 1
fi
