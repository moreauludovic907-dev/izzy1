// ============================================================
// EDGE FUNCTION : parse-quote
// Transforme une dictée artisan en JSON de devis structuré
// - Auth obligatoire
// - Rate limit : 30 / min
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Tu transformes la dictée d'un artisan BTP français en JSON de devis structuré.

Format de réponse OBLIGATOIRE (JSON strict, pas de markdown, pas de backticks) :
{
  "client_name": string | null,
  "lines": [
    {
      "label": string,
      "quantity": number,
      "unit": string,
      "unitPrice": number,
      "vatRate": 5.5 | 10 | 20
    }
  ],
  "notes": string | null
}

Règles :
- Si l'artisan ne précise pas la TVA, choisis 10% par défaut (rénovation classique).
- Si pas de prix unitaire, mets 0 (l'artisan le complètera).
- Si pas de quantité, mets 1. Si pas d'unité, déduis : "8h" → "h", "10 mètres" → "m".
- Découpe en plusieurs lignes si l'artisan parle de plusieurs prestations.
- Unités possibles : "h", "u", "m", "m²", "m³", "forfait", "kg", "l"

Exemple :
Dictée : "Pour Mr Dupont, pose PAC Daikin 8h main d'œuvre à 65 euros TVA 10, plus matériel 1200 euros TVA 20"
Réponse :
{"client_name":"Mr Dupont","lines":[{"label":"Pose PAC Daikin (main d'œuvre)","quantity":8,"unit":"h","unitPrice":65,"vatRate":10},{"label":"Matériel PAC Daikin","quantity":1,"unit":"forfait","unitPrice":1200,"vatRate":20}],"notes":null}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ============ AUTH ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const userId = user.id;

    // ============ RATE LIMIT (30/min) ============
    const now = new Date();
    const { data: existing } = await supabaseAdmin
      .from('rate_limits').select('*')
      .eq('user_id', userId).eq('endpoint', 'parse-quote').maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('rate_limits').insert({
        user_id: userId, endpoint: 'parse-quote', request_count: 1, window_start: now.toISOString(),
      });
    } else {
      const elapsed = (now.getTime() - new Date(existing.window_start).getTime()) / 1000;
      if (elapsed > 60) {
        await supabaseAdmin.from('rate_limits').update({
          request_count: 1, window_start: now.toISOString(),
        }).eq('user_id', userId).eq('endpoint', 'parse-quote');
      } else if (existing.request_count >= 30) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        await supabaseAdmin.from('rate_limits').update({
          request_count: existing.request_count + 1,
        }).eq('user_id', userId).eq('endpoint', 'parse-quote');
      }
    }

    // ============ VALIDATION ============
    const body = await req.json();
    const transcript = typeof body.transcript === 'string' ? body.transcript.slice(0, 5000) : '';
    if (!transcript.trim()) {
      return new Response(JSON.stringify({ error: 'transcript required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ CLAUDE ============
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: transcript }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: 'Claude error', details: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');

    // ============ PARSING & SANITIZATION ============
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON from AI', raw }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeOutput = {
      client_name: typeof parsed.client_name === 'string' ? parsed.client_name : null,
      lines: Array.isArray(parsed.lines) ? parsed.lines.map((l: any) => ({
        label: String(l.label || '').slice(0, 200),
        quantity: Number(l.quantity) || 1,
        unit: ['h', 'u', 'm', 'm²', 'm³', 'forfait', 'kg', 'l'].includes(l.unit) ? l.unit : 'h',
        unitPrice: Math.max(0, Number(l.unitPrice) || 0),
        vatRate: [5.5, 10, 20].includes(Number(l.vatRate)) ? Number(l.vatRate) : 10,
      })) : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 500) : null,
    };

    // Audit log
    try {
      await supabaseAdmin.from('audit_log').insert({
        user_id: userId,
        action: 'parse-quote',
        details: { transcript_length: transcript.length, lines_count: safeOutput.lines.length },
      });
    } catch {}

    return new Response(JSON.stringify(safeOutput), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('parse-quote error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
