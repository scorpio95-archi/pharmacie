// =====================================================================
// Edge Function : send-report
// Rassemble les statistiques de Lakou Pharmacie et envoie un email
// au responsable via Resend (domaine de test pour l'instant).
//
// Déploiement :
//   supabase functions deploy send-report
// Secrets à définir une seule fois :
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set RAPPORT_EMAIL=tonadresse@example.com
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  { table: "pharmacie_stages", label: "Mémoires de stage" },
  { table: "pharmacie_medicaments", label: "Fiches médicament" },
  { table: "pharmacie_plantes", label: "Fiches plante médicinale" },
  { table: "pharmacie_protocoles", label: "Protocoles de dispensation" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    // Client Supabase qui porte l'identité de l'appelant (RLS toujours active)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: CORS_HEADERS,
      });
    }

    const { data: profil } = await supabase
      .from("profiles")
      .select("role, nom_complet")
      .eq("id", user.id)
      .single();

    if (!profil || profil.role !== "admin") {
      return new Response(JSON.stringify({ error: "Réservé aux admins" }), {
        status: 403, headers: CORS_HEADERS,
      });
    }

    // ---- Rassembler les stats ----
    const { count: nbInscrits } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("discipline", "pharmacie");

    const compteurs: Record<string, number> = { en_attente: 0, valide: 0, rejete: 0 };
    const lignesParType: string[] = [];

    for (const t of TABLES) {
      const { data } = await supabase.from(t.table).select("status");
      const parStatut = { en_attente: 0, valide: 0, rejete: 0 };
      (data ?? []).forEach((r: any) => {
        if (parStatut[r.status] !== undefined) parStatut[r.status]++;
        if (compteurs[r.status] !== undefined) compteurs[r.status]++;
      });
      lignesParType.push(
        `<tr><td style="padding:6px 10px;">${t.label}</td>
         <td style="padding:6px 10px;text-align:center;">${parStatut.en_attente}</td>
         <td style="padding:6px 10px;text-align:center;">${parStatut.valide}</td>
         <td style="padding:6px 10px;text-align:center;">${parStatut.rejete}</td></tr>`
      );
    }

    const dateRapport = new Date().toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });

    const html = `
      <div style="font-family:sans-serif; color:#1D2A22; max-width:520px;">
        <h2 style="color:#145C3E;">Rapport Lakou Pharmacie — ${dateRapport}</h2>
        <p>Demandé par ${profil.nom_complet ?? user.email}.</p>
        <p><strong>${nbInscrits ?? 0}</strong> inscrit·e·s au total.</p>
        <p><strong>Global :</strong> ${compteurs.en_attente} en attente,
           ${compteurs.valide} validé(s), ${compteurs.rejete} rejeté(s).</p>
        <table style="border-collapse:collapse; width:100%; margin-top:14px;">
          <thead>
            <tr style="background:#DCEEE3;">
              <th style="padding:6px 10px; text-align:left;">Type</th>
              <th style="padding:6px 10px;">En attente</th>
              <th style="padding:6px 10px;">Validé</th>
              <th style="padding:6px 10px;">Rejeté</th>
            </tr>
          </thead>
          <tbody>${lignesParType.join("")}</tbody>
        </table>
        <p style="margin-top:20px; font-size:12px; color:#5F6B4C;">
          Envoyé automatiquement depuis le tableau de bord admin de Lakou Pharmacie.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Lakou Pharmacie <onboarding@resend.dev>",
        to: [Deno.env.get("RAPPORT_EMAIL")],
        subject: `Rapport Lakou Pharmacie — ${dateRapport}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      return new Response(JSON.stringify({ error: "Échec Resend", detail }), {
        status: 502, headers: CORS_HEADERS,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
});
