import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from './auth/jwt';
import { validateSpanBatch } from './ingestion/validator';
import { insertSpans, getTrace, searchTraces, getMetrics, getAgentPerformance } from './storage/clickhouse';
import { TraceAnalyzer } from './analyzer/anomaly-detector';
import { CostAttribution } from './cost/attribution';
import { ReplayEngine } from './replay/engine';
import { AlertWebhook } from './analyzer/alert-webhook';
import { config } from './config';
import { register } from 'prom-client';

import { parseOtlpTracePayload } from './ingestion/otlp-http';
import { PromptOptimizer } from './analytics/prompt-optimizer';
import { ABTestEngine } from './analytics/ab-testing';
import { RemediationEngine } from './analytics/remediation';

const router = Router();
const analyzer = new TraceAnalyzer();
const costEngine = new CostAttribution();
const replayEngine = new ReplayEngine();
const alertWebhook = new AlertWebhook();
const promptOptimizer = new PromptOptimizer();
const abTestEngine = new ABTestEngine();
const remediationEngine = new RemediationEngine();

// Metrics endpoint for Prometheus
router.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    next(err);
  }
});

// POST /v1/traces (Standard OTLP/HTTP Trace Ingestion)
router.post('/v1/traces', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const batches = parseOtlpTracePayload(req.body);
    if (batches.length === 0) {
      res.status(400).json({ error: { code: 'INVALID_OTLP_PAYLOAD', message: 'No valid OTLP resourceSpans found in payload' } });
      return;
    }

    const totalIngested = await insertSpans(batches);
    res.status(201).json({ ingested: totalIngested, batches: batches.length });
  } catch (err) {
    next(err);
  }
});

// POST /v1/spans
router.post('/v1/spans', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validation = validateSpanBatch(req.body);
    if (validation.error) {
      res.status(400).json({ error: { code: 'INVALID_SPAN_SCHEMA', message: validation.error } });
      return;
    }

    const batch = validation.value!;
    await insertSpans([batch]);

    res.status(201).json({ ingested: batch.spans.length, trace_id: batch.trace_id });
  } catch (err) {
    next(err);
  }
});

// GET /v1/traces/search  <-- Note: Placed BEFORE /v1/traces/:trace_id so 'search' is not matched as :trace_id
router.get('/v1/traces/search', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await searchTraces({
      agent_type: req.query.agent_type as string | undefined,
      status: req.query.status as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      min_cost: req.query.min_cost ? parseFloat(req.query.min_cost as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /v1/traces/analyze
router.post('/v1/traces/analyze', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { trace_id } = req.body;
    if (!trace_id) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'trace_id required' } });
      return;
    }

    const analysis = await analyzer.analyze(trace_id);

    // Send alert if critical anomalies found
    const critical = analysis.anomalies.find(a => a.severity === 'critical');
    if (critical) {
      await alertWebhook.send({
        event_type: 'anomaly_detected',
        trace_id,
        severity: critical.severity,
        description: critical.description,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// GET /v1/traces/:trace_id/optimize-prompts
router.get('/v1/traces/:trace_id/optimize-prompts', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const trace = await getTrace(req.params.trace_id);
    if (!trace) {
      res.status(404).json({ error: { code: 'TRACE_NOT_FOUND', message: `Trace ${req.params.trace_id} not found` } });
      return;
    }

    const optimization = promptOptimizer.analyzeTrace(trace.trace_id, trace.spans);
    res.json(optimization);
  } catch (err) {
    next(err);
  }
});

// GET /v1/traces/:trace_id/replay
router.get('/v1/traces/:trace_id/replay', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!config.features.replay) {
      res.status(403).json({ error: { code: 'FEATURE_DISABLED', message: 'Replay mode is disabled' } });
      return;
    }

    const replay = await replayEngine.getReplay(req.params.trace_id);
    if (!replay) {
      res.status(404).json({ error: { code: 'TRACE_NOT_FOUND', message: 'Trace not found' } });
      return;
    }
    res.json(replay);
  } catch (err) {
    next(err);
  }
});

// GET /v1/traces/:trace_id
router.get('/v1/traces/:trace_id', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const trace = await getTrace(req.params.trace_id);
    if (!trace) {
      res.status(404).json({ error: { code: 'TRACE_NOT_FOUND', message: 'Trace not found' } });
      return;
    }
    res.json(trace);
  } catch (err) {
    next(err);
  }
});

// POST /v1/analytics/ab-compare
router.post('/v1/analytics/ab-compare', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { variant_a, variant_b } = req.body || {};
    const comparison = await abTestEngine.compare(variant_a || {}, variant_b || {});
    res.json(comparison);
  } catch (err) {
    next(err);
  }
});

// GET /v1/remediation/rules
router.get('/v1/remediation/rules', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ rules: remediationEngine.getRules() });
});

// POST /v1/remediation/rules
router.post('/v1/remediation/rules', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const newRule = remediationEngine.addRule({
    rule_id: `rule-${Date.now()}`,
    name: req.body.name || 'New Remediation Rule',
    event_type: req.body.event_type || 'failure_signature',
    agent_type: req.body.agent_type || 'all',
    action: req.body.action || 'notify_slack',
    webhook_url: req.body.webhook_url || 'https://hooks.slack.com/demo',
    enabled: true,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(newRule);
});

// GET /v1/remediation/logs
router.get('/v1/remediation/logs', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ logs: remediationEngine.getLogs() });
});

// POST /v1/remediation/trigger
router.post('/v1/remediation/trigger', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const trace_id = req.body.trace_id || 'tr-autodev-deploy-402';
    const analysis = await analyzer.analyze(trace_id);
    const logs = await remediationEngine.evaluateAndRemediate(analysis);
    res.json({ trace_id, triggered_count: logs.length, logs });
  } catch (err) {
    next(err);
  }
});

// GET /v1/metrics
router.get('/v1/metrics', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const metrics = await getMetrics({
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      group_by: req.query.group_by as string | undefined,
    });
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// GET /v1/agents/:agent_type/performance
router.get('/v1/agents/:agent_type/performance', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const perf = await getAgentPerformance(req.params.agent_type);
    if (!perf) {
      res.status(404).json({ error: { code: 'AGENT_NOT_FOUND', message: 'No data for this agent type' } });
      return;
    }
    res.json(perf);
  } catch (err) {
    next(err);
  }
});

export default router;
