let sortMode = localStorage.getItem("sortMode") || "urgencia";
let filtroUrgentes = false;

const SORT_OPTS = [
  { id: "urgencia",     label: "⚡ Mayor urgencia",   desc: "Pendiente sin resolver más tiempo primero" },
  { id: "updated",      label: "↕ Última actividad",  desc: "Con más cambios recientes al final" },
  { id: "estado",       label: "📊 Por estado",        desc: "Pendientes → En observación" },
  { id: "created_desc", label: "🆕 Más recientes",     desc: "Fallas nuevas primero" },
  { id: "created_asc",  label: "📅 Más antiguas",      desc: "Fallas antiguas primero" },
  { id: "mda",          label: "🔢 Por MDA",           desc: "Orden numérico ascendente" },
];

async function cargarLista() {
  if ($("buscarMda")) $("buscarMda").value = "";
  let fallas = [];
  let desdeCacheLocal = false;
  if (navigator.onLine) {
    const { data, error } = await sb.from("mdas_fallas").select("*").in("estado", ["pendiente", "observacion"]).order("updated_at", { ascending: true });
    if (!error && data) {
      fallas = data;
      localStorage.setItem("cache_fallas", JSON.stringify({ ts: Date.now(), data }));
    } else {
      const cached = JSON.parse(localStorage.getItem("cache_fallas") || "{}");
      fallas = cached.data || cached || [];
      if (Array.isArray(cached)) localStorage.setItem("cache_fallas", JSON.stringify({ ts: Date.now(), data: cached }));
      desdeCacheLocal = true;
    }
  } else {
    const cached = JSON.parse(localStorage.getItem("cache_fallas") || "{}");
    const arr = cached.data || cached || [];
    fallas = (Array.isArray(arr) ? arr : []).filter(f => f.estado === "pendiente" || f.estado === "observacion");
    desdeCacheLocal = true;
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
  arr.forEach(g => g.fallas.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));

  const peorPend = g => g.fallas.filter(f => f.estado === "pendiente").sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))[0];
  const estadoOrd = { pendiente: 0, observacion: 1 };
  if (sortMode === "urgencia") {
    arr.sort((a, b) => {
      const pa = peorPend(a), pb = peorPend(b);
      if (!pa && !pb) return 0; if (!pa) return 1; if (!pb) return -1;
      return new Date(pa.updated_at) - new Date(pb.updated_at);
    });
  } else if (sortMode === "estado") {
    arr.sort((a, b) => {
      const ea = estadoOrd[a.fallas[0].estado] ?? 2, eb = estadoOrd[b.fallas[0].estado] ?? 2;
      return ea !== eb ? ea - eb : new Date(a.fallas[0].updated_at) - new Date(b.fallas[0].updated_at);
    });
  } else if (sortMode === "created_desc") {
    arr.sort((a, b) => new Date(b.fallas[0].created_at) - new Date(a.fallas[0].created_at));
  } else if (sortMode === "created_asc") {
    arr.sort((a, b) => new Date(a.fallas[0].created_at) - new Date(b.fallas[0].created_at));
  } else if (sortMode === "mda") {
    arr.sort((a, b) => parseInt(a.mda) - parseInt(b.mda));
  } else { // updated
    arr.sort((a, b) => new Date(a.fallas[0].updated_at) - new Date(b.fallas[0].updated_at));
  }

  const cont = $("lista");
  if (!arr.length) { cont.innerHTML = '<div class="empty"><p style="color:var(--muted)">Sin fallas pendientes ✓</p></div>'; return; }
  cont.innerHTML = "";

  // Barra de ordenación
  const sortActual = SORT_OPTS.find(o => o.id === sortMode) || SORT_OPTS[0];
  const sortBar = document.createElement("div");
  sortBar.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;position:relative";
  sortBar.innerHTML = `
    <span style="font-size:13px;color:var(--muted)">${fallas.length} falla${fallas.length === 1 ? "" : "s"} activa${fallas.length === 1 ? "" : "s"}</span>
    <button id="btnSort" style="background:var(--panel2);border:1px solid var(--border);color:var(--txt);padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px">
      ${sortActual.label} <span style="color:var(--muted);font-size:10px">▾</span>
    </button>
    <div id="sortDropdown" style="display:none;position:absolute;top:calc(100% + 4px);right:0;background:var(--panel);border:1px solid var(--border);border-radius:10px;z-index:50;min-width:240px;overflow:hidden;box-shadow:0 4px 16px var(--shadow)"></div>`;
  cont.appendChild(sortBar);

  const dropdown = sortBar.querySelector("#sortDropdown");
  SORT_OPTS.forEach(o => {
    const item = document.createElement("div");
    item.style.cssText = `padding:10px 14px;cursor:pointer;display:flex;flex-direction:column;gap:2px;${o.id === sortMode ? "background:var(--panel2)" : ""}`;
    item.innerHTML = `<span style="font-size:13px;font-weight:${o.id === sortMode ? "700" : "400"};color:${o.id === sortMode ? "var(--accent)" : "var(--txt)"}">${o.label}${o.id === sortMode ? " ✓" : ""}</span><span style="font-size:11px;color:var(--muted)">${o.desc}</span>`;
    item.onmouseenter = () => { if (o.id !== sortMode) item.style.background = "var(--panel2)"; };
    item.onmouseleave = () => { if (o.id !== sortMode) item.style.background = ""; };
    item.onclick = e => { e.stopPropagation(); sortMode = o.id; localStorage.setItem("sortMode", sortMode); dropdown.style.display = "none"; cargarLista(); };
    dropdown.appendChild(item);
  });

  sortBar.querySelector("#btnSort").onclick = e => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  };
  document.addEventListener("click", () => { dropdown.style.display = "none"; }, { once: true });

  if (desdeCacheLocal) {
    const cached = JSON.parse(localStorage.getItem("cache_fallas") || "{}");
    const cacheAge = cached.ts ? tiempoDesde(new Date(cached.ts).toISOString()) : "desconocido";
    const banner = document.createElement("div");
    banner.style.cssText = "background:var(--warn);color:#000;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px;text-align:center";
    banner.textContent = navigator.onLine ? "Error al cargar datos frescos · mostrando cache de hace " + cacheAge : "Sin conexión · datos en caché de hace " + cacheAge;
    cont.insertBefore(banner, sortBar.nextSibling);
  }

  // Badge de urgentes en header
  const horasUrgente = getCfg("horas_urgente", 2);
  const urgentes = fallas.filter(f => f.estado === "pendiente" && horasDesde(f.updated_at) >= horasUrgente).length;
  const badge = $("urgenteBadge");
  if (urgentes > 0) {
    badge.textContent = (filtroUrgentes ? "✕ " : "") + urgentes + " urgente" + (urgentes > 1 ? "s" : "");
    badge.classList.remove("hidden");
    badge.style.cursor = "pointer";
    badge.onclick = () => { filtroUrgentes = !filtroUrgentes; cargarLista(); };
    if (filtroUrgentes) badge.style.outline = "2px solid var(--danger)";
    else badge.style.outline = "";
  } else {
    filtroUrgentes = false;
    badge.classList.add("hidden");
  }

  const arrFiltrado = filtroUrgentes
    ? arr.filter(g => g.fallas.some(f => f.estado === "pendiente" && horasDesde(f.updated_at) >= horasUrgente))
    : arr;

  if (filtroUrgentes) {
    const bannerUrg = document.createElement("div");
    bannerUrg.style.cssText = "background:var(--danger);color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px;text-align:center;cursor:pointer";
    bannerUrg.textContent = "Mostrando solo urgentes · toca para ver todas";
    bannerUrg.onclick = () => { filtroUrgentes = false; cargarLista(); };
    cont.appendChild(bannerUrg);
  }

  arrFiltrado.forEach(g => {
    const card = document.createElement("div");
    card.className = "mda-card";
    // Urgencia: usar la falla pendiente más vieja del grupo
    const peorFalla = g.fallas.filter(f => f.estado === "pendiente").sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))[0];
    const urg = peorFalla ? urgenciaStyle(peorFalla.updated_at, peorFalla.estado) : "";
    if (urg) card.style.cssText = urg;
    if (peorFalla && horasDesde(peorFalla.updated_at) >= horasUrgente * 12) card.classList.add("urgente-card");
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
      const estadoTiempo = f.estado === "observacion" ? `En observación hace ${tiempoDesde(f.updated_at)}` : f.estado === "pendiente" ? `Pendiente hace ${tiempoDesde(f.updated_at)}` : "";
      const fila = document.createElement("div");
      const esUrgente = f.estado === "pendiente" && horasDesde(f.updated_at) >= horasUrgente;
      fila.className = "falla-mini" + (esUrgente ? " urgente" : "");
      fila.innerHTML = `
        <div class="falla-mini-top">
          <span class="age-dot ${f.estado === 'observacion' ? 'obs' : ageClass(d)}"></span>
          <span class="falla-txt">${esc(f.falla)}</span>
          <span class="falla-age">${ageTxt(d)}</span>
        </div>
        <div class="ult-accion">Creada: ${fmtFecha(f.created_at)}${estadoTiempo ? " · " + estadoTiempo : ""}</div>
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
      fila.querySelector("[data-volvio='" + f.id + "']")?.addEventListener("click", ev => { ev.stopPropagation(); volvioAFallar(f.id); });
    });

    card.appendChild(mini);
    cont.appendChild(card);
  });

  audit("ver_portada", { total_fallas: fallas.length });
}

async function cambiarEstadoPortada(fallaId, estado) {
  if (estado === "resuelta") { if (!await confirmar("¿Resuelta con voucher?", { ok: "Sí, resuelta", danger: false })) return; }
  if (estado === "observacion") { if (!await confirmar("¿Pasar a observación?", { ok: "Sí, en observación", danger: false })) return; }
  const upd = { estado, updated_at: new Date().toISOString() };
  if (navigator.onLine) {
    const { error } = await sb.from("mdas_fallas").update(upd).eq("id", fallaId);
    if (error) { cola.push({ id: uid(), t: "estado", d: { id: fallaId, estado } }); guardarCola(); }
  } else {
    cola.push({ id: uid(), t: "estado", d: { id: fallaId, estado } });
    guardarCola();
  }
  audit("cambiar_estado", { falla_id: fallaId, estado });
  toast(estado === "resuelta" ? "Resuelta" : estado === "observacion" ? "En observación" : "Pendiente");
  cargarLista();
}

async function volvioAFallar(fallaId) {
  if (!await confirmar("¿Volvió a fallar?", { ok: "Sí, volvió", danger: true })) return;
  const ts = new Date().toISOString();

  if (navigator.onLine) {
    // Buscar la última acción que "resolvió"
    const { data: accs } = await sb.from("acciones").select("*").eq("falla_id", fallaId).eq("resultado", "resolvio").eq("anulada", false).order("created_at", { ascending: false }).limit(1);
    if (accs && accs.length) {
      const ultima = accs[0];
      // Anular la acción anterior (queda tachada)
      await sb.from("acciones").update({ anulada: true }).eq("id", ultima.id);
      // Crear nueva acción con "no resolvió"
      await sb.from("acciones").insert({
        falla_id: fallaId,
        accion: ultima.accion,
        resultado: "no_resolvio",
        tecnico,
        created_at: ts,
        historial_resultados: `resolvió (${ultima.tecnico} · ${fmtFecha(ultima.created_at)}) → volvió a fallar`
      });
    }
    await sb.from("mdas_fallas").update({ estado: "pendiente", updated_at: ts }).eq("id", fallaId);
  } else {
    cola.push({ id: uid(), t: "estado", d: { id: fallaId, estado: "pendiente" } });
    guardarCola();
  }

  audit("volvio_a_fallar", { falla_id: fallaId });
  toast("Volvió a pendiente");
  cargarLista();
}
