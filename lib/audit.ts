import { supabase } from './supabase';

export async function logAudit(
  action: string,
  actorId: string,
  subjectId: string,
  subjectType: string,
  details?: any
) {
  try {
    await supabase.from('audit_trail').insert({
      action,
      actor_id: actorId,
      subject_id: subjectId,
      subject_type: subjectType,
      details: details || {},
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}