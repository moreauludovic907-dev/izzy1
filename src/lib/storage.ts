import { supabase } from './supabase';
import { getCurrentUser } from './auth';

const BUCKET = 'quote-pdfs';

/**
 * Upload un PDF dans Supabase Storage.
 * Le fichier est stocké dans : quote-pdfs/<user_id>/<filename>
 * Les RLS du bucket garantissent qu'aucun autre user ne peut y accéder.
 */
export async function uploadQuotePDF(quoteId: string, pdfBlob: Blob): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const path = `${user.id}/${quoteId}.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('uploadQuotePDF error:', error);
    return null;
  }
  return path;
}

/**
 * Récupère une URL signée temporaire pour télécharger/voir un PDF.
 * Expire après 15 minutes (recommandation sécurité).
 */
export async function getQuotePDFUrl(quoteId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const path = `${user.id}/${quoteId}.pdf`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 15); // 15 minutes

  if (error || !data) {
    console.error('getQuotePDFUrl error:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Supprime le PDF associé à un devis
 */
export async function deleteQuotePDF(quoteId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const path = `${user.id}/${quoteId}.pdf`;
  await supabase.storage.from(BUCKET).remove([path]);
}
