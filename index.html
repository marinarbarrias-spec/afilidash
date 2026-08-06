// netlify/functions/query.js — AffiliDash v3
// Responsabilidade: retornar dados agregados por período para o frontend
// O frontend nunca mais carrega linhas brutas — recebe KPIs prontos

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SUPA_URL  = () => process.env.SUPABASE_URL;
const SUPA_KEY  = () => process.env.SUPABASE_KEY;
const SUPA_ANON = () => process.env.SUPABASE_ANON_KEY;
const base      = () => `${SUPA_URL()}/rest/v1`;

const sbGet = (path, useAnon = false) => {
  const key = useAnon ? SUPA_ANON() : SUPA_KEY();
  return fetch(`${base()}${path}`, {
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
  });
};

// Paginação completa
const sbGetAll = async (path, useAnon = false) => {
  let todos = [], offset = 0;
  const PAGE = 1000;
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const r   = await sbGet(`${path}${sep}limit=${PAGE}&offset=${offset}`, useAnon);
    if (!r.ok) break;
    const rows = await r.json();
    todos = todos.concat(rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
    if (offset > 500000) break;
  }
  return todos;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!SUPA_URL())
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase não configurado' }) };

  const q = event.queryStringParameters || {};

  try {

    // ════════════════════════════════════════════
    // GET ?action=sync_status
    // Retorna última data sincronizada por conta
    // O frontend usa para saber de onde buscar
    // ════════════════════════════════════════════
    if (q.action === 'sync_status') {
      const rows = await sbGetAll('/sync_control?select=conta_id,plataforma,ultima_data,ultima_execucao,status,registros_ultima');
      return { statusCode: 200, headers, body: JSON.stringify({ sync_status: rows }) };
    }

    // ════════════════════════════════════════════
    // GET ?action=pedidos&de=YYYY-MM-DD&ate=YYYY-MM-DD&contas=ACCENDA,PIPO
    // Retorna pedidos do período para o frontend processar
    // ════════════════════════════════════════════
    if (q.action === 'pedidos') {
      const { de, ate, contas } = q;
      if (!de || !ate) return { statusCode: 400, headers, body: JSON.stringify({ error: 'de e ate obrigatórios' }) };

      let path = `/shopee_pedidos?data_pedido=gte.${de}&data_pedido=lte.${ate}&select=*`;
      if (contas) {
        const lista = contas.split(',').map(c => c.trim()).join(',');
        path += `&conta=in.(${lista})`;
      }

      const rows = await sbGetAll(path, true); // leitura usa anon key
      return { statusCode: 200, headers, body: JSON.stringify({ pedidos: rows, total: rows.length }) };
    }

    // ════════════════════════════════════════════
    // GET ?action=meta&de=YYYY-MM-DD&ate=YYYY-MM-DD&contas=CA-COBR,CA-GRUPO
    // Retorna dados Meta do período
    // ════════════════════════════════════════════
    if (q.action === 'meta') {
      const { de, ate, contas } = q;
      if (!de || !ate) return { statusCode: 400, headers, body: JSON.stringify({ error: 'de e ate obrigatórios' }) };

      let path = `/meta_ads?data=gte.${de}&data=lte.${ate}&select=*`;
      if (contas) {
        const lista = contas.split(',').map(c => c.trim()).join(',');
        path += `&conta=in.(${lista})`;
      }

      const rows = await sbGetAll(path, true);
      return { statusCode: 200, headers, body: JSON.stringify({ meta: rows, total: rows.length }) };
    }

    // ════════════════════════════════════════════
    // GET ?action=cliques&de=YYYY-MM-DD&ate=YYYY-MM-DD
    // ════════════════════════════════════════════
    if (q.action === 'cliques') {
      const { de, ate, contas } = q;
      if (!de || !ate) return { statusCode: 400, headers, body: JSON.stringify({ error: 'de e ate obrigatórios' }) };

      let path = `/shopee_cliques?data=gte.${de}&data=lte.${ate}&select=*`;
      if (contas) {
        const lista = contas.split(',').map(c => c.trim()).join(',');
        path += `&conta=in.(${lista})`;
      }

      const rows = await sbGetAll(path, true);
      return { statusCode: 200, headers, body: JSON.stringify({ cliques: rows, total: rows.length }) };
    }

    // ════════════════════════════════════════════
    // GET ?action=manuais&de=YYYY-MM-DD&ate=YYYY-MM-DD
    // ════════════════════════════════════════════
    if (q.action === 'manuais') {
      const { de, ate, contas } = q;
      if (!de || !ate) return { statusCode: 400, headers, body: JSON.stringify({ error: 'de e ate obrigatórios' }) };

      let path = `/lancamentos_manuais?data=gte.${de}&data=lte.${ate}&select=*`;
      if (contas) {
        const lista = contas.split(',').map(c => c.trim()).join(',');
        path += `&conta=in.(${lista})`;
      }

      const rows = await sbGetAll(path, true);
      return { statusCode: 200, headers, body: JSON.stringify({ manuais: rows, total: rows.length }) };
    }

    // ════════════════════════════════════════════
    // GET ?action=todos&de=...&ate=...&contas=...
    // Retorna tudo de uma vez (pedidos + meta + cliques + manuais)
    // Chamada única do frontend ao trocar de período
    // ════════════════════════════════════════════
    if (q.action === 'todos') {
      const { de, ate, contas } = q;
      if (!de || !ate) return { statusCode: 400, headers, body: JSON.stringify({ error: 'de e ate obrigatórios' }) };

      const contaFiltro = contas
        ? `&conta=in.(${contas.split(',').map(c => c.trim()).join(',')})`
        : '';

      const [pedidos, meta, cliques, manuais] = await Promise.all([
        sbGetAll(`/shopee_pedidos?data_pedido=gte.${de}&data_pedido=lte.${ate}&select=*${contaFiltro}`, true),
        sbGetAll(`/meta_ads?data=gte.${de}&data=lte.${ate}&select=*${contaFiltro}`, true),
        sbGetAll(`/shopee_cliques?data=gte.${de}&data=lte.${ate}&select=*${contaFiltro}`, true),
        sbGetAll(`/lancamentos_manuais?data=gte.${de}&data=lte.${ate}&select=*${contaFiltro}`, true),
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          pedidos,
          meta,
          cliques,
          manuais,
          totais: {
            pedidos: pedidos.length,
            meta:    meta.length,
            cliques: cliques.length,
            manuais: manuais.length,
          },
        }),
      };
    }

    // ════════════════════════════════════════════
    // GET ?action=logs&conta=CA-COBR&limite=50
    // Retorna log de sincronizações
    // ════════════════════════════════════════════
    if (q.action === 'logs') {
      const limite = Math.min(parseInt(q.limite || '50'), 200);
      let path = `/sync_logs?select=*&order=data_execucao.desc&limit=${limite}`;
      if (q.conta) path += `&conta=eq.${q.conta}`;
      const rows = await sbGetAll(path);
      return { statusCode: 200, headers, body: JSON.stringify({ logs: rows }) };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'action inválida',
        opcoes: ['sync_status', 'pedidos', 'meta', 'cliques', 'manuais', 'todos', 'logs'],
      }),
    };

  } catch (err) {
    console.error('Query error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
