import 'dotenv/config';
import config from '../src/config/env.js';

const url = `${config.evolution.url}/webhook/set/${config.evolution.instanceName}`;

const headers = {};
if (config.webhookSecret) {
  headers['x-webhook-secret'] = config.webhookSecret;
}

const response = await fetch(url, {
  method: 'POST',
  headers: {
    apikey: config.evolution.apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    webhook: {
      enabled: true,
      url: config.webhookUrl,
      webhookByEvents: false,
      events: ['MESSAGES_UPSERT'],
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    },
  }),
});

const body = await response.text();
console.log(`Status: ${response.status}`);
console.log(`Webhook URL: ${config.webhookUrl}`);
console.log(`Webhook secret: ${config.webhookSecret ? 'configurado' : 'nao configurado'}`);
console.log(body);
