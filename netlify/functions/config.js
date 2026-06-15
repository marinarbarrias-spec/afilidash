// netlify/functions/config.js — AffiliDash v3
// Responsabilidade: configurações e chaves Supabase
// NÃO lida mais com dados de pedidos/Meta

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const sb = (url, token, method = 'GET', body = null) => {
  const opts = {
    method,
    headers: {
      'apikey': token,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : '',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts);
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const SUPA_URL  = process.env.SUPABASE_URL;
  const SUPA_KEY  = process.env.SUPABASE_KEY;
  const SUPA_ANON = process.env.SUPABASE_ANON_KEY;

  if (!SUPA_URL || !SUPA_KEY) {
    return { statusCode: 200, headers, body: JSON.stringify({}) };
  }

  const base = `${SUPA_URL}/rest/v1`;
  const q    = event.queryStringParameters || {};

  try {

    // ── GET ?action=keys — retorna anon key para o frontend
    if (event.httpMethod === 'GET' && q.action === 'keys') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: SUPA_URL, key: SUPA_ANON || '' }),
      };
    }

    // ── GET — carrega configurações
    if (event.httpMethod === 'GET') {
      const r    = await sb(`${base}/afilidash_config?chave=eq.user-config&select=valor`, SUPA_KEY);
      const rows = r.ok ? await r.json() : [];
      const cfg  = rows[0]?.valor || {};
      return { statusCode: 200, headers, body: JSON.stringify(cfg) };
    }

    // ── POST — salva configurações
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      // Remove campos de dados que não pertencem mais aqui
      const { _dados, _mes, _dados_mes, _indice_meses, ...cfg } = body;
      if (Object.keys(cfg).length > 0) {
        await sb(
          `${base}/afilidash_config?on_conflict=chave`,
          SUPA_KEY,
          'POST',
          [{ chave: 'user-config', valor: cfg }]
        );
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('Config error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
