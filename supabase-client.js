/* =====================================================================
   LAKOU PHARMACIE — client Supabase (singleton)
   Charger AVANT ce script, dans le <head> ou juste avant :
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   Puis sur chaque page : <script src="supabase-client.js"></script>
===================================================================== */
(function () {
  if (window.supabaseClient) return; // évite le bug multi-GoTrueClient

  const SUPABASE_URL = "https://lmeiuqpgdhxpirbnrexy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_AskwnxUUNPVcf7dg61Gf6g_GLAay683";

  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
