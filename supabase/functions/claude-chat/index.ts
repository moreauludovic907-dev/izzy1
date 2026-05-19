// ============================================================
// EDGE FUNCTION : claude-chat (version diagnostic)
// Logs détaillés pour identifier précisément où ça plante
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Tu es IZY, un assistant pour artisans du bâtiment (plombiers, électriciens, façadiers, peintres, maçons, menuisiers).

Ton style :
- Direct, terrain, concret. Pas de blabla corporate.
- Tu tutoies l'artisan, tu l'appelles "chef" parfois.
- Tu connais le métier : TVA 5.5% / 10% / 20%, devis, factures, droit du travail BTP.
- Réponses courtes (3-4 phrases max sauf si question complexe).
- Si l'artisan te demande de rédiger un email ou un devis, fais-le directement.
- Tu parles comme un pote qui s'y connaît.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('=== claude-chat START ===');

  try {
    // ============ 1. AUTH ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ No Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    console.log('Env vars present:', {
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_ANON_KEY: !!supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
      ANTHROPIC_API_KEY: !!apiKey,
      ANTHROPIC_KEY_PREFIX: apiKey ? apiKey.slice(0, 15) + '...' : 'MISSING',
    });

    if (!apiKey) {
      console.log('❌ ANTHROPIC_API_KEY missing in env');
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Supabase secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      console.log('❌ Auth failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Auth OK, user:', user.id);

    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!);
    const userId = user.id;

    // ============ 2. RATE LIMIT (best-effort, ne fait jamais crash) ============
    try {
      const now = new Date();
      const { data: existing } = await supabaseAdmin
        .from('rate_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('endpoint', 'claude-chat')
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from('rate_limits').insert({
          user_id: userId,
          endpoint: 'claude-chat',
          request_count: 1,
          window_start: now.toISOString(),
        });
      } else {
        const elapsed = (now.getTime() - new Date(existing.window_start).getTime()) / 1000;
        if (elapsed > 60) {
          await supabaseAdmin.from('rate_limits').update({
            request_count: 1, window_start: now.toISOString(),
          }).eq('user_id', userId).eq('endpoint', 'claude-chat');
        } else if (existing.request_count >= 20) {
          console.log('❌ Rate limit hit');
          return new Response(JSON.stringify({ error: 'Rate limit : max 20 messages par minute' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          await supabaseAdmin.from('rate_limits').update({
            request_count: existing.request_count + 1,
          }).eq('user_id', userId).eq('endpoint', 'claude-chat');
        }
      }
    } catch (rateLimitErr) {
      console.log('⚠️ Rate limit error (non-fatal):', rateLimitErr);
    }

    // ============ 3. VALIDATION ============
    const body = await req.json();
    console.log('Body messages count:', body.messages?.length);

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.messages.length > 30) {
      return new Response(JSON.stringify({ error: 'Conversation trop longue' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = body.messages
      .filter((m: any) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 8000) }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ 4. CLAUDE API (avec fallback de modèles) ============
    // On essaie plusieurs modèles dans l'ordre, au cas où un nom serait obsolète
    const modelsToTry = [
      'claude-haiku-4-5-20251001',
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
    ];

    let lastError = '';
    for (const model of modelsToTry) {
      console.log(`Trying model: ${model}`);

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });

      if (anthropicRes.ok) {
        const data = await anthropicRes.json();
        const reply = (data.content || [])
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('');

        console.log(`✅ Model ${model} worked, reply length: ${reply.length}`);

        // Audit log best-effort
        try {
          await supabaseAdmin.from('audit_log').insert({
            user_id: userId,
            action: 'claude-chat',
            details: { model, message_count: messages.length, reply_length: reply.length },
          });
        } catch {}

        return new Response(JSON.stringify({ reply, model }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errText = await anthropicRes.text();
        console.log(`❌ Model ${model} failed: ${anthropicRes.status} - ${errText.slice(0, 200)}`);
        lastError = `${anthropicRes.status}: ${errText}`;
        // Si c'est une erreur d'auth (401/403), inutile d'essayer un autre modèle
        if (anthropicRes.status === 401 || anthropicRes.status === 403) {
          break;
        }
      }
    }

    console.log('❌ All models failed');
    return new Response(JSON.stringify({
      error: 'All Claude models failed',
      details: lastError,
      hint: lastError.includes('401') || lastError.includes('403')
        ? 'Clé Anthropic invalide ou expirée'
        : lastError.includes('credit') || lastError.includes('balance')
        ? 'Crédit Anthropic épuisé'
        : 'Tous les noms de modèles testés ont échoué'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.log('❌ Top-level error:', err?.message, err?.stack);
    return new Response(JSON.stringify({
      error: err?.message || 'Internal error',
      stack: err?.stack?.slice(0, 500),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
