let _histFallas = [];

function filtrarHistorial() {
  const q = ($("buscarHist")?.value || "").toLowerCase().trim();
  const body = $("histBody");
  body.querySelectorAll(".mda-card").forEach(card => {
    if (!q) { card.style.display = ""; return; }
    const texto = card.textContent.toLowerCase();
    card.style.display = texto.includes(q) ? "" : "none";
  });
}

async function cargarHistorial() {
  const body = $("histBody");
  body.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  if ($("buscarHist")) $("buscarHist").value = "";
  if (!navigator.onLine) { body.innerHTML = '<p style="color:var(--muted)">Sin conexión.</p>'; return; }

  const { data: fallas } = await sb.from("mdas_fallas").select("*").eq("estado", "resuelta").order("updated_at", { ascending: false });
  if (!fallas?.length) { body.innerHTML = '<div class="empty"><p>Sin resueltas aún</p></div>'; return; }

  _histFallas = fallas;
  body.innerHTML = "";
  fallas.forEach(f => {
    const card = document.createElement("div");
    card.className = "mda-card";
    card.innerHTML = `
      <div class="mda-head" style="cursor:pointer"><div><span class="mda-id">MDA ${f.mda}</span> <span class="mda-isla">isla ${f.isla}</span></div><span class="falla-age">${fmtFecha(f.updated_at)}</span></div>
      <div style="margin-top:8px;font-size:14px">${esc(f.falla)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">Resuelta por ${esc(f.tecnico)}</div>
      <button class="volvio-btn" data-volvio="${f.id}" style="margin-left:0;width:100%;margin-top:10px">⟲ Volvió a fallar</button>`;
    card.querySelector("[data-volvio='" + f.id + "']").onclick = async () => {
      if (!await confirmar("¿Registrar como nueva falla activa? La anterior queda en el historial.", { ok: "Sí, volvió a fallar", danger: true })) return;
      const ts = new Date().toISOString();
      const { data: nueva } = await sb.from("mdas_fallas").insert({
        mda: f.mda, isla: f.isla, falla: f.falla,
        estado: "pendiente", tecnico, created_at: ts, updated_at: ts
      }).select().single();
      if (nueva) {
        await sb.from("acciones").insert({
          falla_id: nueva.id,
          accion: "⟲ Reincidencia (ver historial anterior)",
          resultado: "no_resolvio",
          tecnico,
          created_at: ts
        });
      }
      audit("reincidencia_desde_historial", { falla_id: f.id, mda: f.mda });
      toast("Nueva falla creada");
      cargarHistorial();
      cargarLista();
    };
    card.querySelector(".mda-head").onclick = () => { $("scrHist").classList.add("hidden"); abrirMda(f.mda); };
    body.appendChild(card);
  });

  if ($("buscarHist")) $("buscarHist").oninput = filtrarHistorial;
}
