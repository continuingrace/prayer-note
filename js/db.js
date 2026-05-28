// db.js — Supabase 데이터 CRUD

const DB = (() => {

  // ===== PRAYERS =====
  async function getPrayers() {
    const { data, error } = await supabase
      .from('prayers')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function getPrayer(id) {
    const { data, error } = await supabase
      .from('prayers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function createPrayer(prayer) {
    const user = Auth.getUser();
    const { data, error } = await supabase
      .from('prayers')
      .insert({ ...prayer, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function updatePrayer(id, updates) {
    const { data, error } = await supabase
      .from('prayers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deletePrayer(id) {
    const { error } = await supabase
      .from('prayers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ===== PRAYER LOGS =====
  async function getLogs(prayerId) {
    const { data, error } = await supabase
      .from('prayer_logs')
      .select('*')
      .eq('prayer_id', prayerId)
      .order('date', { ascending: true });
    if (error) throw error;
    return data;
  }

  async function getAllLogs() {
    const { data, error } = await supabase
      .from('prayer_logs')
      .select('*, prayers(title, category)')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function createLog(log) {
    const user = Auth.getUser();
    const { data, error } = await supabase
      .from('prayer_logs')
      .insert({ ...log, user_id: user.id })
      .select()
      .single();
    if (error) throw error;

    // update parent prayer's updated_at
    await supabase
      .from('prayers')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', log.prayer_id);

    return data;
  }

  // ===== BACKUP & RESTORE =====
  async function exportAll() {
    const prayers = await getPrayers();
    const logs = await getAllLogs();
    return { prayers, logs, exportedAt: new Date().toISOString(), version: 1 };
  }

  async function importAll(json) {
    const { prayers, logs } = json;
    const user = Auth.getUser();

    // prayers 먼저 삽입 (id 유지)
    if (prayers && prayers.length > 0) {
      const mapped = prayers.map(p => ({ ...p, user_id: user.id }));
      const { error } = await supabase.from('prayers').upsert(mapped, { onConflict: 'id' });
      if (error) throw error;
    }

    // logs 삽입
    if (logs && logs.length > 0) {
      const rawLogs = logs.map(l => {
        const { prayers: _, ...rest } = l;
        return { ...rest, user_id: user.id };
      });
      const { error } = await supabase.from('prayer_logs').upsert(rawLogs, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  return {
    getPrayers, getPrayer, createPrayer, updatePrayer, deletePrayer,
    getLogs, getAllLogs, createLog,
    exportAll, importAll,
  };
})();
