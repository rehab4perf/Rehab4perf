// Netlify Function — save-cr-config
// Écrit config/cr-config.json dans le dépôt GitHub (admin seulement)
// Env vars requises : GITHUB_TOKEN, CR_ADMIN_KEY

exports.handler = async function(event) {
  // CORS preflight
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // Auth
  const adminKey = event.headers['x-admin-key'] || '';
  if (!process.env.CR_ADMIN_KEY || adminKey !== process.env.CR_ADMIN_KEY) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Parse body
  let config;
  try {
    config = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = 'rehab4perf';
  const repo  = 'Rehab4perf';
  const path  = 'config/cr-config.json';
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const ghHeaders = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Rehab4Perf-Admin'
  };

  try {
    // 1. Get current file SHA
    const getResp = await fetch(apiBase, { headers: ghHeaders });
    const getJson = await getResp.json();
    const sha = getJson.sha;
    if (!sha) throw new Error('Cannot get file SHA: ' + JSON.stringify(getJson));

    // 2. Encode new content
    const newContent = Buffer.from(JSON.stringify(config, null, 2), 'utf8').toString('base64');

    // 3. PUT to GitHub
    const putResp = await fetch(apiBase, {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify({
        message: 'chore: update cr-config via admin UI',
        content: newContent,
        sha: sha,
        committer: { name: 'Rehab4Perf Admin', email: 'ap.kine92@gmail.com' }
      })
    });
    const putJson = await putResp.json();
    if (!putResp.ok) throw new Error('GitHub PUT error: ' + JSON.stringify(putJson));

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, commit: putJson.commit && putJson.commit.sha }) };
  } catch(err) {
    console.error('save-cr-config error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
