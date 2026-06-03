async function cargarLista() {
  let fallas = [];
  if (navigator.onLine) {
    const { data, error } = await sb.from("mdas_fallas").select("*").in("estado", ["pendiente", "observacion"]).order("updated_at", { ascending: true });
    if (!error && data) { fallas = data; localStorage.setItem("cache_fallas", JSON.stringify(data)); }
    else fallas = JSON.parse(localStorage.getItem("cache_fallas") || "[]");
  } else {
    fallas = JSON.parse(localStorage.getItem("cache_fallas") || "[]").filter(f => f.estado === "pendiente" || f.estado === "observacion");
  }

  const ultAcc = {};
  if (navigator.onLine && fallas.length) {
    const ids = fallas.map(f => f.id);
    const { data: accs } = await sb.from("acciones").select("falla_id,accion,resultado,created_at,anulada").in("falla_id", ids).order("created_at", { ascending: false });
    (accs || []).forEach(a => { if (!a.anulada && !ultAcc[a.falla_id]) ultAcc[a.falla_id] = a; });
  }

  const grupos = {};
  fallas.forEach(f => { (grupos[f.mda] = grupos[f.mda] || { mda: f.mda, isla: f.isla, fallas: [] }).fallas.push(f); });
  const arr = Object.values(grupos);
  arr.forEach(g => g.fallas.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at)));
  arr.sort((a, b) => new Date(a.fallas[0].updated_at) - new Date(b.fallas[0].updated_at));

  const cont = $("lista");
  if (!arr.length) { cont.innerHTML = '<div class="empty"><p style="color:var(--muted)">Sin fallas pendientes ✓</p></div>'; return; }
  cont.innerHTML = "";

  arr.forEach(g => {
    const card = document.createElement("div");
    card.className = "mda-card";
    card.onclick = () => abrirMda(g.mda);

    const head = document.createElement("div");
    head.className = "mda-head";
    head.innerHTML = `<div><span class="mda-id">MDA ${g.mda}</span> <span class="mda-isla">isla ${g.isla}</span></div><span class="mda-count">${g.fallas.length} ${g.fallas.length === 1 ? "falla" : "fallas"}</span>`;
    card.appendChild(head);

    const mini = document.createElement("div");
    mini.className = "fallas-mini";
    g.fallas.forEach(f => {
      const d = diasDesde(f.updated_at);
      const acc = ultAcc[f.id];
      const fila = document.createElement("div");
      fila.className = "falla-mini";
      fila.innerHTML = `
        <div class="falla-mini-top">
          <span class="age-dot ${f.estado === 'observacion' ? 'obs' : ageClass(d)}"></span>
          <span class="falla-txt">${esc(f.falla)}</span>
          <span class="falla-age">${ageTxt(d)}</span>
        </div>
        ${acc ? `<div class="ult-accion">Última: ${esc(acc.accion)} · ${acc.resultado === "resolvio" ? "resolvió" : acc.resultado === "no_resolvio" ? "no resolvió" : "pendiente"}</div>` : `<div class="ult-accion">Sin acciones aún</div>`}
        <div class="est-seg" data-est="${f.id}">
          <button data-e="pendiente" class="${f.estado === 'pendiente' ? 'on' : ''}">Pendiente</button>
          <button data-e="observacion" class="${f.estado === 'observacion' ? 'on' : ''}">En observación</button>
          <button data-e="resuelta">Resuelto</button>
        </div>
        ${f.estado === 'observacion' ? `<button class="volvio-btn" data-volvio="${f.id}">⟲ Volvió a fallar</button>` : ''}`;
      mini.appendChild(fila);
      fila.querySelectorAll(".est-seg button").forEach(b => {
        b.onclick = ev => { ev.stopPropagation(); cambiarEstadoPortada(f.id, b.dataset.e); };
      });
      fila.querySelector("[data-volvio='" + f.id + "']")?.addEventListener("click", ev => { ev.stopPropagation(); cambiarEstadoPortada(f.id, "pendiente"); });
    });

    card.appendChild(mini);
    cont.appendChild(card);
  });

  audit("ver_portada", { total_fallas: fallas.length });
}

async function cambiarEstadoPortada(fallaId, estado) {
  if (estado === "resuelta") { if (!confirm("¿Estái seguro? ¿Con váucher? 🧾")) return; }
  const upd = { estado, updated_at: new Date().toISOString() };
  if (navigator.onLine) {
    const { error } = await sb.from("mdas_fallas").update(upd).eq("id", fallaId);
    if (error) { cola.push({ t: "estado", d: { id: fallaId, estado } }); guardarCola(); }
  } else {
    cola.push({ t: "estado", d: { id: fallaId, estado } });
    guardarCola();
  }
  audit("cambiar_estado", { falla_id: fallaId, estado });
  toast(estado === "resuelta" ? "Resuelta" : estado === "observacion" ? "En observación" : "Pendiente");
  cargarLista();
}
