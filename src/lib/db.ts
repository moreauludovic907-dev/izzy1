import { openDB } from 'idb';
import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import type { Client, Quote, UserProfile, ChatMessage } from '@/types';

/**
 * db.ts — couche d'accès aux données.
 *
 * Stratégie : Supabase (source de vérité) + IndexedDB (cache local rapide).
 * - Lectures : cache d'abord (instantané), puis sync Supabase en arrière-plan
 * - Écritures : Supabase d'abord, puis mirror dans le cache
 *
 * Si l'user n'est pas authentifié, on tombe en mode 100% local (legacy / mode dégradé).
 */

// ===================== CACHE LOCAL (IndexedDB) =====================
let _db: any = null;
async function localCache() {
  if (_db) return _db;
  _db = await openDB('izy', 2, {
    upgrade(d) {
      if (!d.objectStoreNames.contains('clients')) d.createObjectStore('clients', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('quotes')) d.createObjectStore('quotes', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('messages')) d.createObjectStore('messages', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
    },
  });
  return _db;
}

// ===================== HELPERS =====================
async function requireUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

// Conversion DB <-> camelCase (Supabase utilise snake_case)
function quoteFromDb(row: any): Quote {
  return {
    id: row.id,
    number: row.number,
    clientName: row.client_name,
    lines: row.lines || [],
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalHT: Number(row.total_ht),
    totalTTC: Number(row.total_ttc),
    totalVAT: Number(row.total_vat),
  };
}
function quoteToDb(q: Quote, userId: string) {
  return {
    id: q.id,
    user_id: userId,
    number: q.number,
    client_name: q.clientName,
    lines: q.lines,
    notes: q.notes || null,
    status: q.status,
    total_ht: q.totalHT,
    total_ttc: q.totalTTC,
    total_vat: q.totalVAT,
  };
}

function clientFromDb(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    createdAt: row.created_at,
  };
}
function clientToDb(c: Client, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    email: c.email || null,
    phone: c.phone || null,
    address: c.address || null,
  };
}

function messageFromDb(row: any): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
  };
}
function messageToDb(m: ChatMessage, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    role: m.role,
    content: m.content,
  };
}

function profileFromDb(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name || undefined,
    companyName: row.company_name,
    trade: row.trade || undefined,
    siret: row.siret || undefined,
    phone: row.phone || undefined,
    needs: row.needs || [],
    izyTone: row.izy_tone || undefined,
    company: row.company || undefined,
    modules: row.modules || [],
    onboardingDone: row.onboarding_done || false,
    createdAt: row.created_at,
  };
}

// ===================== CLIENTS =====================
export async function listClients(): Promise<Client[]> {
  const uid = await requireUserId();
  if (!uid) return (await localCache()).getAll('clients');

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listClients error:', error);
    return (await localCache()).getAll('clients');
  }
  const clients = (data || []).map(clientFromDb);
  // Mirror cache
  const cache = await localCache();
  const tx = cache.transaction('clients', 'readwrite');
  await tx.store.clear();
  for (const c of clients) await tx.store.add(c);
  await tx.done;
  return clients;
}

export async function saveClient(c: Client): Promise<void> {
  const uid = await requireUserId();
  if (uid) {
    const { error } = await supabase.from('clients').upsert(clientToDb(c, uid));
    if (error) throw error;
  }
  await (await localCache()).put('clients', c);
}

// ===================== QUOTES =====================
export async function listQuotes(): Promise<Quote[]> {
  const uid = await requireUserId();
  if (!uid) return (await localCache()).getAll('quotes');

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listQuotes error:', error);
    return (await localCache()).getAll('quotes');
  }
  const quotes = (data || []).map(quoteFromDb);
  const cache = await localCache();
  const tx = cache.transaction('quotes', 'readwrite');
  await tx.store.clear();
  for (const q of quotes) await tx.store.add(q);
  await tx.done;
  return quotes;
}

export async function getQuote(id: string): Promise<Quote | null> {
  const uid = await requireUserId();
  if (!uid) return (await localCache()).get('quotes', id);

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .eq('user_id', uid)
    .single();
  if (error || !data) return (await localCache()).get('quotes', id);
  return quoteFromDb(data);
}

export async function saveQuote(q: Quote): Promise<void> {
  const uid = await requireUserId();
  if (uid) {
    const { error } = await supabase.from('quotes').upsert(quoteToDb(q, uid));
    if (error) throw error;
  }
  await (await localCache()).put('quotes', q);
}

export async function deleteQuote(id: string): Promise<void> {
  const uid = await requireUserId();
  if (uid) {
    const { error } = await supabase.from('quotes').delete().eq('id', id).eq('user_id', uid);
    if (error) throw error;
  }
  await (await localCache()).delete('quotes', id);
}

// ===================== MESSAGES =====================
export async function listMessages(): Promise<ChatMessage[]> {
  const uid = await requireUserId();
  if (!uid) return (await localCache()).getAll('messages');

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('listMessages error:', error);
    return (await localCache()).getAll('messages');
  }
  return (data || []).map(messageFromDb);
}

export async function saveMessage(m: ChatMessage): Promise<void> {
  const uid = await requireUserId();
  if (uid) {
    const { error } = await supabase.from('messages').insert(messageToDb(m, uid));
    if (error) console.error('saveMessage error:', error);
  }
  await (await localCache()).put('messages', m);
}

// ===================== PROFILE =====================
export async function getProfile(): Promise<UserProfile | null> {
  const uid = await requireUserId();
  if (!uid) return (await localCache()).get('meta', 'profile') || null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  if (error || !data) return null;
  const profile = profileFromDb(data);
  await (await localCache()).put('meta', profile, 'profile');
  return profile;
}

export async function saveProfile(p: UserProfile): Promise<void> {
  const uid = await requireUserId();
  if (uid) {
    const dbPayload = {
      id: uid,
      email: p.email,
      first_name: p.firstName || null,
      company_name: p.companyName || 'Mon entreprise',
      trade: p.trade || null,
      siret: p.siret || null,
      phone: p.phone || null,
      needs: p.needs || [],
      izy_tone: p.izyTone || null,
      company: p.company || null,
      modules: p.modules || [],
      onboarding_done: p.onboardingDone || false,
    };
    const { error } = await supabase.from('profiles').upsert(dbPayload);
    if (error) {
      console.error('saveProfile error:', error);
      throw error;
    }
  }
  await (await localCache()).put('meta', p, 'profile');
}

// ===================== META (config locale) =====================
export async function setMeta(key: string, value: any): Promise<void> {
  await (await localCache()).put('meta', value, key);
}

export async function getMeta<T = any>(key: string): Promise<T | null> {
  return (await localCache()).get('meta', key) || null;
}

// ===================== UTILITAIRES RGPD =====================
/**
 * Exporte toutes les données de l'utilisateur (conformité RGPD)
 */
export async function exportUserData(): Promise<any> {
  const profile = await getProfile();
  const clients = await listClients();
  const quotes = await listQuotes();
  const messages = await listMessages();
  return {
    exported_at: new Date().toISOString(),
    profile,
    clients,
    quotes,
    messages,
  };
}

/**
 * Supprime le compte et toutes les données associées (RGPD)
 * Les RLS + cascade DB s'occupent du wipe complet
 */
export async function deleteUserAccount(): Promise<void> {
  const uid = await requireUserId();
  if (!uid) throw new Error('Not authenticated');

  // 1. Supprimer toutes les données métier (la cascade fera le reste)
  await supabase.from('quotes').delete().eq('user_id', uid);
  await supabase.from('clients').delete().eq('user_id', uid);
  await supabase.from('messages').delete().eq('user_id', uid);
  await supabase.from('profiles').delete().eq('id', uid);

  // 2. Wipe cache local
  const cache = await localCache();
  await cache.clear('quotes');
  await cache.clear('clients');
  await cache.clear('messages');
  await cache.clear('meta');

  // 3. La suppression du compte auth lui-même nécessite l'API admin
  //    → On fait juste sign-out. L'admin pourra supprimer l'auth user via dashboard.
  await supabase.auth.signOut();
}
