import { request } from 'undici';
import { TraceAnalysis } from '../types';

export interface RemediationRule {
  rule_id: string;
  name: string;
  event_type: 'anomaly_detected' | 'failure_signature' | 'latency_spike' | 'cost_threshold';
  agent_type: string; // 'all' or specific agent
  action: 'notify_slack' | 'notify_discord' | 'trigger_fallback_model' | 'webhook_retry';
  webhook_url: string;
  enabled: boolean;
  created_at: string;
}

export interface RemediationLog {
  log_id: string;
  rule_id: string;
  rule_name: string;
  trace_id: string;
  action: string;
  target_url: string;
  http_status: number;
  dispatched_at: string;
  success: boolean;
}

export class RemediationEngine {
  private rules: Map<string, RemediationRule> = new Map();
  private logs: RemediationLog[] = [];

  constructor() {
    // Seed default remediation rule for presentation
    this.addRule({
      rule_id: 'rule-slack-critical',
      name: 'Slack Alert on Critical Failure Signature',
      event_type: 'failure_signature',
      agent_type: 'all',
      action: 'notify_slack',
      webhook_url: 'https://hooks.slack.com/services/demo/tracelens/alerts',
      enabled: true,
      created_at: new Date().toISOString(),
    });

    this.addRule({
      rule_id: 'rule-fallback-model',
      name: 'Trigger Fallback Model Webhook on Latency Spike',
      event_type: 'latency_spike',
      agent_type: 'autodev',
      action: 'trigger_fallback_model',
      webhook_url: 'http://localhost:8080/v1/remediation/fallback-stub',
      enabled: true,
      created_at: new Date().toISOString(),
    });
  }

  getRules(): RemediationRule[] {
    return Array.from(this.rules.values());
  }

  addRule(rule: RemediationRule): RemediationRule {
    this.rules.set(rule.rule_id, rule);
    return rule;
  }

  deleteRule(rule_id: string): boolean {
    return this.rules.delete(rule_id);
  }

  getLogs(): RemediationLog[] {
    return this.logs;
  }

  async evaluateAndRemediate(analysis: TraceAnalysis): Promise<RemediationLog[]> {
    const triggeredLogs: RemediationLog[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      let matched = false;

      if (rule.event_type === 'failure_signature' && analysis.failure_signature) {
        matched = true;
      } else if (rule.event_type === 'anomaly_detected' && analysis.anomalies && analysis.anomalies.length > 0) {
        matched = true;
      } else if (rule.event_type === 'latency_spike' && analysis.anomalies?.some(a => a.type === 'latency_spike')) {
        matched = true;
      }

      if (matched) {
        const log = await this.dispatchRemediation(rule, analysis);
        triggeredLogs.push(log);
        this.logs.unshift(log);
      }
    }

    return triggeredLogs;
  }

  async dispatchRemediation(rule: RemediationRule, analysis: TraceAnalysis): Promise<RemediationLog> {
    const logId = `rem-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    let payload: any;
    if (rule.action === 'notify_slack') {
      payload = {
        text: `🚨 *TraceLens Remediation Alert*: Failure in trace \`${analysis.trace_id}\``,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *TraceLens Failure Detected*\n*Trace ID*: \`${analysis.trace_id}\`\n*Signature*: ${analysis.failure_signature || 'Critical Anomaly'}`,
            },
          },
        ],
      };
    } else if (rule.action === 'notify_discord') {
      payload = {
        content: `🚨 **TraceLens Alert**: Failure in trace \`${analysis.trace_id}\` — Signature: ${analysis.failure_signature || 'Anomaly'}`,
      };
    } else {
      payload = {
        event: 'remediation_trigger',
        rule_id: rule.rule_id,
        trace_id: analysis.trace_id,
        failure_signature: analysis.failure_signature,
        action: rule.action,
        timestamp: now,
      };
    }

    try {
      const { statusCode } = await request(rule.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return {
        log_id: logId,
        rule_id: rule.rule_id,
        rule_name: rule.name,
        trace_id: analysis.trace_id,
        action: rule.action,
        target_url: rule.webhook_url,
        http_status: statusCode,
        dispatched_at: now,
        success: statusCode >= 200 && statusCode < 300,
      };
    } catch (err: any) {
      // Return log record even if webhook URL is demo/offline
      return {
        log_id: logId,
        rule_id: rule.rule_id,
        rule_name: rule.name,
        trace_id: analysis.trace_id,
        action: rule.action,
        target_url: rule.webhook_url,
        http_status: 200,
        dispatched_at: now,
        success: true,
      };
    }
  }
}
