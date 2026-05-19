// ============================================================
// EDGE FUNCTION : route-intent
// Détermine vers quel mode router selon ce que dit l'artisan
// - Auth obligatoire
// - Rate limit : 30 / min
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Tu es le routeur d'intention d'IZY, un assistant pour artisans BTP.
Tu reçois une phrase et tu détermines vers quel mode rediriger l'utilisateur.

Les 4 modes :
- "my-time"  : créer un devis vocal (ex : "Pose PAC Daikin 8h TVA 10")
- "on-air"   : analyser un problème visuel sur chantier (ex : "j'ai une infiltration")
- "mode-izy" : poser une question / demander un conseil (ex : "quel taux TVA rénovation ?")
- "societe"  : voir les stats / chiffres / bilan (ex : "montre mes chiffres")

Réponds UNIQUEMENT en JSON strict (pas de markdown) :
{"mode":"my-time"|"on-air"|"mode-izy"|"societe","confidence":0.0-1.0,"reason":"raison courte"}`;

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
      .eq('user_id', userId).eq('endpoint', 'route-intent').maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('rate_limits').insert({
        user_id: userId, endpoint: 'route-intent', request_count: 1, window_start: now.toISOString(),
      });
    } else {
      const elapsed = (now.getTime() - new Date(existing.window_start).getTime()) / 1000;
      if (elapsed > 60) {
        await supabaseAdmin.from('rate_limits').update({
          request_count: 1, window_start: now.toISOString(),
        }).eq('user_id', userId).eq('endpoint', 'route-intent');
      } else if (existing.request_count >= 30) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        await supabaseAdmin.from('rate_limits').update({
          request_count: existing.request_count + 1,
        }).eq('user_id', userId).eq('endpoint', 'route-intent');
      }
    }

    // ============ VALIDATION ============
    const body = await req.json();
    const transcript = typeof body.transcript === 'string' ? body.transcript.slice(0, 2000) : '';
    if (!transcript.trim()) {
      return new Response(JSON.stringify({ mode: 'my-time', confidence: 0, reason: 'empty' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: transcript }],
      }),
    });

    if (!anthropicRes.ok) {
      return new Response(JSON.stringify({ mode: 'my-time', confidence: 0.3, reason: 'ai-failed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');

    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { mode: 'my-time', confidence: 0.4, reason: 'parse-error' };
    }

    const validModes = ['my-time', 'on-air', 'mode-izy', 'societe'];
    const safeOutput = {
      mode: validModes.includes(parsed.mode) ? parsed.mode : 'my-time',
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : 'ai',
    };

    return new Response(JSON.stringify(safeOutput), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('route-intent error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
