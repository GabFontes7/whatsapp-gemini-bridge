import axios from 'axios';
import config from '../config/env.js';

export async function sendWhatsAppMessage(remoteJid, text) {
  const number = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  const url = `${config.evolution.url}/message/sendText/${config.evolution.instanceName}`;

  const { data } = await axios.post(
    url,
    { number, text, linkPreview: false },
    {
      headers: {
        apikey: config.evolution.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    }
  );

  return data;
}

export async function checkConnection() {
  try {
    const { data } = await axios.get(`${config.evolution.url}/`, {
      headers: { apikey: config.evolution.apiKey },
      timeout: 5_000,
    });
    return data?.status === 200;
  } catch {
    return false;
  }
}
