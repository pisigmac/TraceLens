import { config } from '../config';
import { request } from 'undici';

export interface AlertPayload {
  event_type: string;
  trace_id: string;
  severity: string;
  description: string;
  timestamp: string;
}

export class AlertWebhook {
  async send(payload: AlertPayload): Promise<void> {
    if (!config.alerting.enabled || !config.alerting.webhookUrl) return;

    try {
      await request(config.alerting.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Alert webhook failed:', err);
    }
  }
}
