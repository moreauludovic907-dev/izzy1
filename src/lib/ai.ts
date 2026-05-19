import type { QuoteLine, ChatMessage } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { uid } from './quote';

export type ParsedQuote = {
  clientName: string | null;
  lines: QuoteLine[];
  notes: string | null;
};

// ============== Dictation → Quote parser ==============
export async function parseDictationToQuote(transcript: string): Promise<ParsedQuote> {
  if (!transcript.trim()) return { clientName: null, lines: [], notes: null };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('parse-quote', {
        body: { transcript },
      });
      if (!error && data?.lines) {
        return {
          clientName: data.client_name ?? null,
          lines: (data.lines || []).map((l: any) => ({
            id: uid(),
            label: l.label,
            quantity: Number(l.quantity) || 1,
            unit: l.unit || 'h',
            unitPrice: Number(l.unitPrice) || 0,
            vatRate: [5.5, 10, 20].includes(Number(l.vatRate)) ? Number(l.vatRate) : 20,
          })),
          notes: data.notes ?? null,
        };
      }
      if (error) console.warn('parse-quote Edge Function failed:', error);
    } catch (e) {
      console.warn('parse-quote invoke threw:', e);
    }
  }

  // Fallback : parse simple par regex (utile en dev ou si Edge Function casse)
  return fallbackParse(transcript);
}

// ============== Chat MODE IZY ==============
export async function chatWithIzy(history: ChatMessage[]): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('claude-chat', {
        body: {
          messages: history.map((m) => ({
            role: m.role === 'izy' ? 'assistant' : 'user',
            content: m.content,
          })),
        },
      });
      if (!error && data?.reply) {
        return data.reply;
      }
      if (error) {
        console.warn('claude-chat Edge Function failed:', error);
        return "Désolé chef, j'arrive pas à te répondre là. Réessaie dans un instant.";
      }
    } catch (e) {
      console.warn('claude-chat invoke threw:', e);
      return "Connexion impossible. Vérifie ton réseau et réessaie.";
    }
  }

  // Mode dev / non configuré : réponse mock
  const last = history[history.length - 1]?.content || '';
  return `[Mode démo — Claude pas branché]\nTu m'as dit : "${last}".\n\nQuand l'IA sera connectée, je te répondrai vraiment.`;
}

// ============== Fallback regex parser (mode dev) ==============
function fallbackParse(transcript: string): ParsedQuote {
  const lower = transcript.toLowerCase();
  const lines: QuoteLine[] = [];

  // Tente de détecter des lignes basiques (très simpliste)
  const hourMatch = lower.match(/(\d+)\s*h(?:eures?)?(?:\s+de\s+(.+?))?(?:\s+à\s+(\d+))?/);
  if (hourMatch) {
    const qty = parseInt(hourMatch[1], 10);
    const desc = hourMatch[2]?.trim() || "Main d'œuvre";
    const price = hourMatch[3] ? parseInt(hourMatch[3], 10) : 65;
    lines.push({
      id: uid(),
      label: capitalize(desc),
      quantity: qty,
      unit: 'h',
      unitPrice: price,
      vatRate: lower.includes('tva 5') ? 5.5 : lower.includes('tva 20') ? 20 : 10,
    });
  }

  if (lines.length === 0) {
    lines.push({
      id: uid(),
      label: capitalize(transcript.slice(0, 60)),
      quantity: 1,
      unit: 'forfait',
      unitPrice: 0,
      vatRate: 20,
    });
  }

  return {
    clientName: null,
    lines,
    notes: null,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
