// Netlify Function — proxy para API Shopee Affiliate BR
// Resolve o problema de CORS ao chamar a API do navegador

const crypto = require('crypto');

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { query, appId, secret } = JSON.parse(event.body);

    if (!query || !appId || !secret) {
      return { statusCode: 400, body: JSON.stringify({ error: 'query, appId e secret são obrigatórios' }) };
    }

    const SHOPEE_URL = 'https://open-api.affiliate.shopee.com.br/graphql';
    const timestamp  = Math.floor(Date.now() / 1000);
    const payload    = JSON.stringify({ query });
    const base       = appId + timestamp + payload + secret;
    const signature  = crypto.createHash('sha256').update(base).digest('hex');
    const auth       = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

    const response = await fetch(SHOPEE_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': auth,
      },
      body: payload,
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
