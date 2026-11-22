import type { TadimState } from '../types';

interface DigestVenue {
  rank: number;
  name: string;
  district: string;
  city: string;
  category: string;
  score: number;
  signatureDish: string;
}

function buildTopVenues(state: TadimState, limit = 10): DigestVenue[] {
  const byId = new Map(state.venues.map((v) => [v.id, v]));
  return [...state.ranked]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r, i) => {
      const v = byId.get(r.venueId);
      return {
        rank: i + 1,
        name: v?.name ?? r.venueId,
        district: v?.district ?? '',
        city: v?.city ?? '',
        category: v?.category ?? '',
        score: Math.round(r.score * 10) / 10,
        signatureDish: v?.signatureDish ?? '',
      };
    });
}

export function buildTadimN8nWorkflow(state: TadimState) {
  const top = buildTopVenues(state);
  const code = [
    `const venues = ${JSON.stringify(top)};`,
    `const lines = venues.map(v => \`\${v.rank}. \${v.name} (\${v.district}) — \${v.score}/10 · \${v.signatureDish}\`);`,
    `const text = venues.length ? '🍽️ TadımRotası Top 10\\n' + lines.join('\\n') : 'TadımRotası: henüz sıralanmış mekan yok.';`,
    `return [{ json: { text, venues } }];`,
  ].join('\n');

  return {
    name: 'TadımRotası — Haftalık Top 10 Özeti',
    nodes: [
      {
        parameters: { httpMethod: 'POST', path: 'tadimrotasi-digest', responseMode: 'onReceived' },
        id: 'webhook-trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [240, 300],
      },
      {
        parameters: { jsCode: code },
        id: 'format-top10',
        name: 'Format Top 10 Venues',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [480, 300],
      },
      {
        parameters: { chatId: 'YOUR_CHAT_ID', text: '={{ $json.text }}', additionalFields: {} },
        id: 'telegram-send',
        name: 'Telegram',
        type: 'n8n-nodes-base.telegram',
        typeVersion: 1.2,
        position: [720, 300],
      },
    ],
    connections: {
      'Webhook Trigger': { main: [[{ node: 'Format Top 10 Venues', type: 'main', index: 0 }]] },
      'Format Top 10 Venues': { main: [[{ node: 'Telegram', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
    meta: { generator: 'TadımRotası', exportedAt: new Date().toISOString() },
  };
}

export function downloadTadimN8nBlueprint(state: TadimState): number {
  const workflow = buildTadimN8nWorkflow(state);
  const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tadimrotasi-n8n-digest.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return Math.min(state.ranked.length, 10);
}
