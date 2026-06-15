// netlify/functions/sync.js — AffiliDash v3
// Responsabilidade: receber dados do frontend e gravar nas tabelas corretas
// Chamado pelo frontend após buscar dados das APIs (Shopee, Meta) ou importar CSV

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SUPA_URL = () => process.env.SUPABASE_URL;
const SUPA_KEY = () => process.env.SUPABASE_KEY;
const base     = () => `${SUPA_URL()}/rest/v1`;

// ── HELPER: upsert em lotes ──────────────────────────────────
const upsert = async (tabela, conflict, rows, LOTE = 200) => {
  const erros = [];
  for (let i = 0; i < rows.length; i += LOTE) {
    const lote = rows.slice(i, i + LOTE);
    const res  = await fetch(`${base()}/${tabela}?on_conflict=${conflict}`, {
      method: 'POST',
      headers: {
        'apikey':        SUPA_KEY(),
        'Authorization': `Bearer ${SUPA_KEY()}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(lote),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => String(res.status));
      erros.push(`lote ${i}: ${txt}`);
      console.error(`Erro upsert ${tabela} lote ${i}:`, txt);
    }
  }
  return erros;
};

// ── HELPER: gravar log de sync ───────────────────────────────
const gravarLog = async (conta, plataforma, inicio, fim, status, recebidos, salvos, erro = null) => {
  try {
    await fetch(`${base()}/sync_logs`, {
      method: 'POST',
      headers: {
        'apikey':        SUPA_KEY(),
        'Authorization': `Bearer ${SUPA_KEY()}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        conta, plataforma,
        inicio:              inicio || null,
        fim:                 fim    || null,
        status,
        registros_recebidos: recebidos || 0,
        registros_salvos:    salvos    || 0,
        erro:                erro ? String(erro).slice(0, 500) : null,
      }),
    });
  } catch(e) {
    console.warn('Falha ao gravar log:', e.message);
  }
};

// ── HELPER: atualizar sync_control ───────────────────────────
const atualizarControl = async (conta_id, plataforma, ultima_data, registros) => {
  try {
    await fetch(`${base()}/sync_control?on_conflict=conta_id,plataforma`, {
      method: 'POST',
      headers: {
        'apikey':        SUPA_KEY(),
        'Authorization': `Bearer ${SUPA_KEY()}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{
        conta_id,
        plataforma,
        ultima_data,
        ultima_execucao:  new Date().toISOString(),
        status:           'ok',
        registros_ultima: registros,
      }]),
    });
  } catch(e) {
    console.warn('Falha ao atualizar sync_control:', e.message);
  }
};

// ── HANDLER ──────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Apenas POST' }) };

  if (!SUPA_URL() || !SUPA_KEY())
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase não configurado' }) };

  const body = JSON.parse(event.body || '{}');
  const tipo = (event.queryStringParameters || {}).tipo || body._tipo;

  try {

    // ════════════════════════════════════════════
    // SHOPEE PEDIDOS
    // Recebe array de pedidos da API Shopee ou CSV
    // ════════════════════════════════════════════
    if (tipo === 'shopee') {
      const pedidos = body.pedidos || [];
      if (!pedidos.length)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, salvos: 0 }) };

      const conta  = body.conta || '';
      const inicio = pedidos.reduce((m,r) => r.data_pedido < m ? r.data_pedido : m, pedidos[0].data_pedido);
      const fim    = pedidos.reduce((m,r) => r.data_pedido > m ? r.data_pedido : m, pedidos[0].data_pedido);

      // Garante campos obrigatórios e normaliza
      const rows = pedidos.map(p => ({
        order_id:         p.order_id         || '',
        conversion_id:    p.conversion_id    || null,
        conta:            p.conta            || conta,
        data_pedido:      p.data_pedido      || null,
        hora_pedido:      p.hora_pedido      ?? null,
        data_conclusao:   p.data_conclusao   || null,
        data_click:       p.data_click       || null,
        sub_id:           (p.sub_id          || '').toLowerCase(),
        operacao:         p.operacao         || null,
        status:           p.status           || null,
        comissao_bruta:   Number(p.comissao_bruta)  || 0,
        venda_total:      Number(p.venda_total)      || 0,
        venda_direta:     Boolean(p.venda_direta),
        shop_name:        p.shop_name        || null,
        item_name:        p.item_name        || null,
        channel_type:     p.channel_type     || null,
        attribution_type: p.attribution_type || null,
        fonte:            p.fonte            || 'api',
        updated_at:       new Date().toISOString(),
      })).filter(r => r.order_id);

      const erros = await upsert('shopee_pedidos', 'order_id', rows);
      const salvos = rows.length - (erros.length * 200); // estimativa

      await gravarLog(conta, 'shopee', inicio, fim, erros.length ? 'erro' : 'ok', pedidos.length, salvos, erros[0]);
      if (!erros.length) await atualizarControl(conta, 'shopee', fim, salvos);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: !erros.length, salvos: rows.length, erros }),
      };
    }

    // ════════════════════════════════════════════
    // META ADS
    // Recebe array de registros de campanhas Meta
    // ════════════════════════════════════════════
    if (tipo === 'meta') {
      const registros = body.registros || [];
      if (!registros.length)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, salvos: 0 }) };

      const conta   = body.conta     || '';
      const contaId = body.conta_id  || '';
      const inicio  = registros.reduce((m,r) => r.data < m ? r.data : m, registros[0].data);
      const fim     = registros.reduce((m,r) => r.data > m ? r.data : m, registros[0].data);

      const rows = registros.map(r => ({
        // id: conta_meta_id|data|campanha — chave única
        id:              `${r.conta_meta_id || contaId}|${r.data}|${r.campanha || ''}`,
        conta:           r.conta            || conta,
        conta_meta_id:   r.conta_meta_id    || contaId,
        data:            r.data,
        campanha:        r.campanha         || null,
        campanha_id:     r.campanha_id      || null,
        status_camp:     r.status_camp      || null,
        gasto:           Number(r.gasto)            || 0,
        impressoes:      Number(r.impressoes)       || 0,
        alcance:         Number(r.alcance)          || 0,
        frequencia:      Number(r.frequencia)       || 0,
        cliques_link:    Number(r.cliques_link)     || 0,
        cliques_total:   Number(r.cliques_total)    || 0,
        ctr_link:        Number(r.ctr_link)         || 0,
        cpc_link:        Number(r.cpc_link)         || 0,
        cpm:             Number(r.cpm)              || 0,
        resultado:       Number(r.resultado)        || 0,
        custo_resultado: Number(r.custo_resultado)  || 0,
        updated_at:      new Date().toISOString(),
      })).filter(r => r.data && r.conta_meta_id);

      const erros = await upsert('meta_ads', 'id', rows);

      await gravarLog(conta, 'meta', inicio, fim, erros.length ? 'erro' : 'ok', registros.length, rows.length, erros[0]);
      if (!erros.length) await atualizarControl(conta, 'meta', fim, rows.length);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: !erros.length, salvos: rows.length, erros }),
      };
    }

    // ════════════════════════════════════════════
    // SHOPEE CLIQUES
    // Recebe array de cliques do CSV
    // ════════════════════════════════════════════
    if (tipo === 'cliques') {
      const cliques = body.cliques || [];
      if (!cliques.length)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, salvos: 0 }) };

      const conta  = body.conta || '';
      const inicio = cliques.reduce((m,r) => r.data < m ? r.data : m, cliques[0].data);
      const fim    = cliques.reduce((m,r) => r.data > m ? r.data : m, cliques[0].data);

      const rows = cliques.map(c => ({
        id:            `${c.conta || conta}|${c.data}|${c.hora !== null && c.hora !== undefined ? String(c.hora).padStart(2,'0') : 'xx'}|${(c.sub_id||'').toLowerCase()}`,
        conta:         c.conta    || conta,
        data:          c.data,
        hora:          c.hora     ?? null,
        sub_id:        (c.sub_id  || '').toLowerCase(),
        cliques:       Number(c.cliques) || 1,
        regiao:        c.regiao   || null,
        referenciador: c.referenciador || null,
        updated_at:    new Date().toISOString(),
      })).filter(r => r.data);

      const erros = await upsert('shopee_cliques', 'id', rows);

      await gravarLog(conta, 'cliques', inicio, fim, erros.length ? 'erro' : 'ok', cliques.length, rows.length, erros[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: !erros.length, salvos: rows.length, erros }),
      };
    }

    // ════════════════════════════════════════════
    // LANÇAMENTOS MANUAIS
    // ════════════════════════════════════════════
    if (tipo === 'manuais') {
      const lancamentos = body.lancamentos || [];
      if (!lancamentos.length)
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, salvos: 0 }) };

      const rows = lancamentos.map(l => ({
        id:          l.id || `manual|${l.conta}|${l.data}|${(l.sub_id||'').toLowerCase()}`,
        conta:       l.conta       || '',
        data:        l.data        || null,
        sub_id:      (l.sub_id     || '').toLowerCase(),
        operacao:    l.operacao    || null,
        comissao:    Number(l.comissao)    || 0,
        venda_total: Number(l.venda_total) || 0,
        updated_at:  new Date().toISOString(),
      })).filter(r => r.id && r.data && r.conta);

      const erros = await upsert('lancamentos_manuais', 'id', rows);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: !erros.length, salvos: rows.length, erros }),
      };
    }

    // ════════════════════════════════════════════
    // DELETAR LANÇAMENTO MANUAL
    // Recebe { id } e remove da tabela lancamentos_manuais
    // ════════════════════════════════════════════
    if (tipo === 'manuais_del') {
      const id = body.id;
      if (!id)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id obrigatório' }) };

      const res = await fetch(`${base()}/lancamentos_manuais?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'apikey':        SUPA_KEY(),
          'Authorization': `Bearer ${SUPA_KEY()}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => String(res.status));
        console.error('Erro ao deletar lançamento:', txt);
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: txt }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id }) };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Tipo desconhecido: ${tipo}. Use: shopee, meta, cliques, manuais, manuais_del` }),
    };

  } catch (err) {
    console.error('Sync error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
