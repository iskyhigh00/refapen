async function cargarObrist() {
  const body = $("obristBody");
  body.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data: fallas } = await sb.from("mdas_fallas").select("*").order("created_at", { ascending: false });
  body.innerHTML = "";

  // ── Helper: sección colapsable ───────────────────────────────────────────
  function mkSeccion({ icono, titulo, subtitulo, abierto = true, peligro = false }) {
    const sec = document.createElement("div");
    sec.className = "admin-section";
    sec.style.cssText = peligro
      ? "border:1px solid var(--danger);border-radius:12px;padding:14px;background:rgba(218,54,51,.05)"
      : "";

    const head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding-bottom:" + (abierto ? "12px" : "0") + ";margin-bottom:" + (abierto ? "0" : "0");
    head.innerHTML = `
      <div>
        <div style="font-size:15px;font-weight:700;${peligro ? 'color:var(--danger)' : ''}">${icono} ${titulo}</div>
        ${subtitulo ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">${subtitulo}</div>` : ""}
      </div>
      <span class="obr-arr" style="color:var(--muted);font-size:18px;transition:.2s;${abierto ? 'transform:rotate(90deg)' : ''}">›</span>`;

    const cuerpo = document.createElement("div");
    cuerpo.style.display = abierto ? "block" : "none";

    head.onclick = () => {
      const ab = cuerpo.style.display !== "none";
      cuerpo.style.display = ab ? "none" : "block";
      head.querySelector(".obr-arr").style.transform = ab ? "" : "rotate(90deg)";
      head.style.paddingBottom = ab ? "0" : "12px";
    };

    sec.appendChild(head);
    sec.appendChild(cuerpo);
    body.appendChild(sec);
    return cuerpo;
  }


  // ══════════════════════════════════════════════════════════════════
  // 1. CONFIGURACIÓN — tema visual + comportamiento
  // ══════════════════════════════════════════════════════════════════
  const cfgCuerpo = mkSeccion({
    icono: "⚙️",
    titulo: "Configuración",
    subtitulo: "Apariencia y comportamiento de la app",
    abierto: true
  });

  // Apariencia — tema
  const TEMAS = [
    { id: "oscuro",     nombre: "Oscuro",   bg: "#0d1117", txt: "#e6edf3", accent: "#2f81f7" },
    { id: "medianoche", nombre: "Violeta",  bg: "#0b0e14", txt: "#d4dae3", accent: "#7c3aed" },
    { id: "oceano",     nombre: "Océano",   bg: "#0f172a", txt: "#e2e8f0", accent: "#06b6d4" },
    { id: "claro",      nombre: "Claro",    bg: "#f5f6f8", txt: "#1f2937", accent: "#2563eb" },
    { id: "arena",      nombre: "Arena",    bg: "#faf6f1", txt: "#3d3529", accent: "#b45309" }
  ];
  const temaActual = localStorage.getItem("tema_" + tecnico) || localStorage.getItem("tema_fallas") || "oscuro";

  const subApariencia = document.createElement("div");
  subApariencia.innerHTML = `<div class="obr-sub-label">Tema visual</div>`;
  const grid = document.createElement("div");
  grid.className = "theme-grid";
  grid.id = "themeGrid";
  TEMAS.forEach(t => {
    const btn = document.createElement("div");
    btn.className = "theme-btn" + (t.id === temaActual ? " active" : "");
    btn.style.background = t.bg;
    btn.style.color = t.txt;
    btn.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:${t.accent};margin:0 auto 6px"></div>${t.nombre}`;
    btn.onclick = () => {
      document.documentElement.setAttribute("data-theme", t.id);
      localStorage.setItem("tema_" + tecnico, t.id);
      grid.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      audit("cambiar_tema", { tema: t.id });
    };
    grid.appendChild(btn);
  });
  subApariencia.appendChild(grid);
  cfgCuerpo.appendChild(subApariencia);

  // Comportamiento
  const subComp = document.createElement("div");
  subComp.style.marginTop = "20px";
  subComp.innerHTML = `
    <div class="obr-sub-label">Comportamiento</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-size:14px;font-weight:600">Horas para urgente</div>
          <div style="font-size:12px;color:var(--muted)">Una falla pendiente se marca urgente después de este tiempo</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex:none">
          <input type="number" id="cfgHorasUrgente" min="1" max="72" value="${getCfg('horas_urgente', 2)}" style="width:64px;text-align:center;margin:0;padding:6px">
          <span style="font-size:13px;color:var(--muted)">h</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-size:14px;font-weight:600">Mínimo para sugerir</div>
          <div style="font-size:12px;color:var(--muted)">Una acción solo se sugiere si resolvió ese problema esta cantidad de veces</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex:none">
          <input type="number" id="cfgMinSug" min="1" max="20" value="${getCfg('min_sugerencias', 1)}" style="width:64px;text-align:center;margin:0;padding:6px">
          <span style="font-size:13px;color:var(--muted)">veces</span>
        </div>
      </div>
      <button class="btn btn-ok btn-sm" id="btnGuardarCfg" style="align-self:flex-end;margin-top:4px">Guardar cambios</button>
    </div>`;
  cfgCuerpo.appendChild(subComp);

  $("btnGuardarCfg").onclick = () => {
    const h = parseInt($("cfgHorasUrgente").value);
    const s = parseInt($("cfgMinSug").value);
    if (isNaN(h) || h < 1 || h > 72) { toast("Horas inválidas (1–72)"); return; }
    if (isNaN(s) || s < 1 || s > 20) { toast("Mínimo inválido (1–20)"); return; }
    setCfg("horas_urgente", h);
    setCfg("min_sugerencias", s);
    audit("cambiar_config", { horas_urgente: h, min_sugerencias: s });
    toast("Configuración guardada");
    cargarLista();
  };


  // ══════════════════════════════════════════════════════════════════
  // 2. CARGA MASIVA
  // ══════════════════════════════════════════════════════════════════
  const masivaCuerpo = mkSeccion({
    icono: "📥",
    titulo: "Carga masiva",
    subtitulo: "Crear la misma falla en múltiples máquinas a la vez",
    abierto: false
  });

  masivaCuerpo.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <label style="margin:0 0 6px">1. Descripción de la falla</label>
        <textarea id="csvFalla" placeholder="pérdida de imagen en pantalla superior" style="min-height:48px;margin:0"></textarea>
      </div>
      <div>
        <label style="margin:0 0 6px">2. Máquinas (MDA e isla)</label>
        <p style="font-size:12px;color:var(--muted);margin-bottom:8px">Pega desde Excel (dos columnas: MDA · isla) o sube un CSV separado por comas. La isla acepta formatos: 200, 200-01, 20001.</p>
        <textarea id="excelPaste" placeholder="100011&#9;113&#10;100234&#9;200-01&#10;…" style="min-height:80px;margin:0;font-family:monospace;font-size:13px"></textarea>
        <label class="btn btn-sec btn-sm" style="margin-top:8px;cursor:pointer;display:inline-block">
          ↑ O subir CSV<input type="file" id="csvFile" accept=".csv,.txt" style="display:none">
        </label>
      </div>
      <div id="csvPreview" style="font-size:13px;color:var(--muted)"></div>
      <button class="btn btn-ok" id="btnCargaMasiva" style="display:none;margin-top:0">Crear fallas</button>
    </div>`;

  let csvRows = [], csvErrores = [];

  function parsearFilas(txt) {
    csvErrores = [];
    return txt.trim().split("\n").map((l, i) => {
      const parts = l.split(/\t|,| {2,}/).map(s => s.trim().replace(/^"|"$/g, ""));
      if (parts.length < 2) { csvErrores.push("Fila " + (i + 1) + ": faltan columnas"); return null; }
      const mda = mda6(parts[0] || "");
      const num = parseInt(mda);
      if (mda.length !== 6 || isNaN(num) || num < 100000 || num > 101199) { csvErrores.push("Fila " + (i + 1) + ": MDA inválido (" + parts[0] + ")"); return null; }
      const p = parseIsla(parts[1] || "");
      if (!p.ok) { csvErrores.push("Fila " + (i + 1) + ": isla inválida (" + parts[1] + ")"); return null; }
      return { mda, isla: p.valor };
    }).filter(Boolean);
  }

  function actualizarPreview() {
    const prev = $("csvPreview");
    if (!csvRows.length && !csvErrores.length) { prev.textContent = ""; $("btnCargaMasiva").style.display = "none"; return; }
    let html = "";
    if (csvRows.length) html += `<b>${csvRows.length} máquinas válidas:</b> ` + csvRows.slice(0, 4).map(r => `MDA ${r.mda} · isla ${r.isla}`).join(", ") + (csvRows.length > 4 ? ` y ${csvRows.length - 4} más…` : "");
    if (csvErrores.length) html += `<div style="color:var(--danger);margin-top:6px"><b>${csvErrores.length} fila${csvErrores.length > 1 ? "s" : ""} con error:</b><br>` + csvErrores.slice(0, 3).join("<br>") + (csvErrores.length > 3 ? `<br>…y ${csvErrores.length - 3} más` : "") + "</div>";
    prev.innerHTML = html;
    $("btnCargaMasiva").style.display = csvRows.length ? "block" : "none";
  }

  masivaCuerpo.querySelector("#excelPaste").oninput = function() { csvRows = parsearFilas(this.value); actualizarPreview(); };
  masivaCuerpo.querySelector("#csvFile").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    csvRows = parsearFilas(await file.text()); actualizarPreview();
  };
  masivaCuerpo.querySelector("#btnCargaMasiva").onclick = async () => {
    const falla = $("csvFalla").value.trim();
    if (!falla) { toast("Escribe la descripción de la falla"); return; }
    if (!csvRows.length) { toast("Agrega al menos una máquina"); return; }
    if (!await confirmar(`¿Crear ${csvRows.length} falla${csvRows.length > 1 ? "s" : ""} con "${falla}"?`, { ok: "Crear" })) return;
    const ts = new Date().toISOString();
    const inserts = csvRows.map(r => ({ mda: r.mda, isla: r.isla, falla, estado: "pendiente", tecnico, created_at: ts, updated_at: ts }));
    const { error } = await sb.from("mdas_fallas").insert(inserts);
    if (error) { toast("Error: " + error.message); return; }
    audit("carga_masiva", { total: inserts.length, falla });
    toast(`${inserts.length} falla${inserts.length > 1 ? "s" : ""} creada${inserts.length > 1 ? "s" : ""}`);
    csvRows = []; $("csvPreview").textContent = ""; $("csvFalla").value = ""; $("btnCargaMasiva").style.display = "none";
    cargarLista();
  };


  // ══════════════════════════════════════════════════════════════════
  // 3. ACCIONES NO CATALOGADAS
  // ══════════════════════════════════════════════════════════════════
  const revCuerpo = mkSeccion({
    icono: "🔍",
    titulo: "Acciones no catalogadas",
    subtitulo: "Registradas por técnicos fuera del catálogo — revisa y decide",
    abierto: true
  });

  (async () => {
    revCuerpo.innerHTML = '<p style="color:var(--muted);font-size:13px">Cargando…</p>';

    const dismissedKey = "obrist_dismissed_accs";
    const dismissed = new Set(JSON.parse(localStorage.getItem(dismissedKey) || "[]"));

    const [{ data: catData }, { data: accs }] = await Promise.all([
      sb.from("catalogo_acciones").select("accion").eq("activa", true),
      sb.from("acciones").select("*, mdas_fallas(mda, isla, falla)").eq("anulada", false)
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
        .order("created_at", { ascending: false })
    ]);

    const catalogoSet = new Set((catData || []).map(c => c.accion.toLowerCase().trim()));
    const stripSuffix = s => s.replace(/\s*\([^)]*\)\s*$/g, "").trim();

    const noEnCatalogo = (accs || []).filter(a =>
      !dismissed.has(a.id) && !catalogoSet.has(stripSuffix(a.accion).toLowerCase())
    );

    if (!noEnCatalogo.length) {
      revCuerpo.innerHTML = '<p style="color:var(--ok);font-size:13px">✓ Sin acciones fuera del catálogo en los últimos 30 días</p>';
      return;
    }

    revCuerpo.innerHTML = `<p style="font-size:12px;color:var(--muted);margin-bottom:12px">${noEnCatalogo.length} acción${noEnCatalogo.length !== 1 ? "es" : ""} no catalogada${noEnCatalogo.length !== 1 ? "s" : ""} en los últimos 30 días</p>`;

    noEnCatalogo.forEach(a => {
      const mda = a.mdas_fallas;
      const base = stripSuffix(a.accion);
      const resColor = a.resultado === "resolvio" ? "var(--ok)" : a.resultado === "no_resolvio" ? "var(--danger)" : "var(--warn)";
      const resLabel = a.resultado === "resolvio" ? "resolvió" : a.resultado === "no_resolvio" ? "no resolvió" : "pendiente";

      const row = document.createElement("div");
      row.className = "admin-item";
      row.style.cssText = "flex-direction:column;align-items:start;gap:8px;padding:12px";
      row.innerHTML = `
        <div style="width:100%;display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div>
            <div style="font-weight:700;font-size:14px">${esc(a.accion)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(a.tecnico)} · MDA ${mda?.mda || "?"} · isla ${mda?.isla || "?"} · hace ${tiempoDesde(a.created_at)}</div>
            ${mda?.falla ? `<div style="font-size:12px;color:var(--muted);margin-top:1px;font-style:italic">${esc(mda.falla)}</div>` : ""}
          </div>
          <span style="color:${resColor};font-size:11px;font-weight:700;flex:none">${resLabel}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ok btn-sm" style="margin:0" data-addcat>+ Agregar al catálogo</button>
          <button class="btn btn-sec btn-sm" style="margin:0" data-dismiss>✓ Está bien así</button>
        </div>`;

      row.querySelector("[data-addcat]").onclick = async () => {
        const catNames = Object.keys(ACCIONES);
        const cat = await preguntar("¿A qué categoría? (" + catNames.join(", ") + ")");
        if (!cat || !catNames.includes(cat)) { toast("Categoría inválida"); return; }
        const { error } = await sb.from("catalogo_acciones").insert({ categoria: cat, accion: base, activa: true });
        if (error) { toast("Error: " + error.message); return; }
        audit("agregar_accion_catalogo", { accion: base, categoria: cat });
        await cargarMaestros();
        toast("Agregada al catálogo");
        row.remove();
      };

      row.querySelector("[data-dismiss]").onclick = () => {
        dismissed.add(a.id);
        localStorage.setItem(dismissedKey, JSON.stringify([...dismissed]));
        row.remove();
        toast("OK");
      };

      revCuerpo.appendChild(row);
    });
  })();


  // ══════════════════════════════════════════════════════════════════
  // 4. AUDITORÍA
  // ══════════════════════════════════════════════════════════════════
  const auditCuerpo = mkSeccion({
    icono: "📋",
    titulo: "Auditoría",
    subtitulo: "Registro de todas las acciones realizadas en la app",
    abierto: false
  });

  auditCuerpo.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <input id="auditBuscar" placeholder="Técnico o acción…" style="margin:0;flex:1;min-width:140px">
      <select id="auditFiltro" style="margin:0;width:auto;min-width:90px">
        <option value="7">7 días</option>
        <option value="30">30 días</option>
        <option value="todo">Todo</option>
      </select>
      <button class="btn btn-sec btn-sm" id="btnAuditCargar" style="margin-top:0;white-space:nowrap">Cargar</button>
    </div>
    <div id="auditLista" style="font-size:13px;color:var(--muted)">Presioná Cargar para ver registros</div>`;

  auditCuerpo.querySelector("#btnAuditCargar").onclick = async () => {
    const lista = $("auditLista");
    lista.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
    let query = sb.from("auditoria").select("*").order("created_at", { ascending: false }).limit(200);
    const dias = $("auditFiltro").value;
    if (dias !== "todo") query = query.gte("created_at", new Date(Date.now() - parseInt(dias) * 86400000).toISOString());
    const { data, error } = await query;
    if (error) { lista.innerHTML = '<p style="color:var(--danger)">Error al cargar auditoría</p>'; return; }
    if (!data?.length) { lista.innerHTML = '<p style="color:var(--muted)">Sin registros</p>'; return; }
    const q = ($("auditBuscar").value || "").toLowerCase();
    const filtrados = q ? data.filter(r => (r.tecnico || "").toLowerCase().includes(q) || (r.accion || "").toLowerCase().includes(q)) : data;
    if (!filtrados.length) { lista.innerHTML = '<p style="color:var(--muted)">Sin coincidencias</p>'; return; }
    lista.innerHTML = "";
    filtrados.forEach(r => {
      const row = document.createElement("div");
      row.style.cssText = "padding:8px 0;border-bottom:1px solid var(--border)";
      let detTxt = "";
      if (r.detalle && typeof r.detalle === "object") detTxt = Object.entries(r.detalle).map(([k, v]) => k + ": " + (typeof v === "object" ? JSON.stringify(v) : v)).join(" · ");
      row.innerHTML = `<div style="display:flex;justify-content:space-between"><b style="color:var(--accent)">${esc(r.accion)}</b><span style="font-size:11px">${fmtFecha(r.created_at)}</span></div><div style="font-size:12px">${esc(r.tecnico)}${detTxt ? ' · <span style="color:var(--muted)">' + esc(detTxt) + "</span>" : ""}</div>`;
      lista.appendChild(row);
    });
  };


  // ══════════════════════════════════════════════════════════════════
  // 4. ZONA DE PELIGRO — borrar fallas
  // ══════════════════════════════════════════════════════════════════
  const borrarCuerpo = mkSeccion({
    icono: "⚠️",
    titulo: "Zona de peligro",
    subtitulo: "Borrar fallas de forma permanente e irreversible",
    abierto: false,
    peligro: true
  });

  if (!fallas?.length) {
    borrarCuerpo.innerHTML = '<p style="color:var(--muted);font-size:13px">No hay fallas registradas.</p>';
    return;
  }

  let fallasMostradas = fallas;
  const seleccionadas = new Set();

  borrarCuerpo.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
      <input id="borrarBuscar" placeholder="Filtrar por MDA, isla o descripción…" style="margin:0;flex:1">
      <select id="borrarEstado" style="margin:0;width:auto">
        <option value="todas">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="observacion">En observación</option>
        <option value="resuelta">Resuelta</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="btn btn-sec btn-sm" id="obSelTodas" style="margin-top:0">Seleccionar visibles</button>
      <button class="btn btn-sec btn-sm" id="obSelNinguna" style="display:none;margin-top:0">Deseleccionar</button>
      <button class="btn btn-danger btn-sm" id="obBorrarSel" style="display:none;margin-top:0">🗑️ Borrar (<span id="obSelCount">0</span>)</button>
    </div>
    <div id="listaObrist"></div>`;

  function actualizarBarraBorrar() {
    const n = seleccionadas.size;
    $("obSelCount").textContent = n;
    $("obBorrarSel").style.display = n ? "inline-block" : "none";
    $("obSelNinguna").style.display = n ? "inline-block" : "none";
  }

  function pintarFallas() {
    const q = ($("borrarBuscar")?.value || "").toLowerCase();
    const est = $("borrarEstado")?.value || "todas";
    fallasMostradas = fallas.filter(f => {
      const matchEst = est === "todas" || f.estado === est;
      const matchQ = !q || f.mda.includes(q) || f.isla.toLowerCase().includes(q) || f.falla.toLowerCase().includes(q);
      return matchEst && matchQ;
    });
    const lista = $("listaObrist");
    lista.innerHTML = "";
    if (!fallasMostradas.length) { lista.innerHTML = '<p style="color:var(--muted);font-size:13px">Sin coincidencias</p>'; return; }
    fallasMostradas.forEach(f => {
      const row = document.createElement("div");
      row.className = "admin-item";
      row.style.cursor = "pointer";
      const estColor = { pendiente: "var(--warn)", observacion: "var(--accent)", resuelta: "var(--ok)" }[f.estado] || "var(--muted)";
      const estLabel = { pendiente: "Pendiente", observacion: "Observación", resuelta: "Resuelta" }[f.estado] || f.estado;
      row.innerHTML = `
        <input type="checkbox" data-check="${f.id}" style="width:20px;height:20px;margin-right:8px;flex:none;accent-color:var(--danger);cursor:pointer" ${seleccionadas.has(f.id) ? "checked" : ""}>
        <span style="flex:1">
          <b>MDA ${f.mda}</b> · isla ${f.isla}
          <br><span style="font-size:12px;color:var(--muted)">${esc(f.falla)}</span>
        </span>
        <span style="font-size:11px;color:${estColor};white-space:nowrap;font-weight:600">${estLabel}</span>`;
      if (seleccionadas.has(f.id)) row.style.background = "rgba(218,54,51,.1)";
      const cb = row.querySelector("input");
      cb.onchange = () => {
        if (cb.checked) seleccionadas.add(f.id); else seleccionadas.delete(f.id);
        row.style.background = cb.checked ? "rgba(218,54,51,.1)" : "";
        actualizarBarraBorrar();
      };
      row.onclick = e => { if (e.target !== cb) { cb.checked = !cb.checked; cb.onchange(); } };
      lista.appendChild(row);
    });
  }

  borrarCuerpo.querySelector("#borrarBuscar").oninput = pintarFallas;
  borrarCuerpo.querySelector("#borrarEstado").onchange = pintarFallas;

  borrarCuerpo.querySelector("#obSelTodas").onclick = () => {
    fallasMostradas.forEach(f => seleccionadas.add(f.id));
    pintarFallas();
    actualizarBarraBorrar();
  };
  borrarCuerpo.querySelector("#obSelNinguna").onclick = () => {
    seleccionadas.clear();
    pintarFallas();
    actualizarBarraBorrar();
  };
  borrarCuerpo.querySelector("#obBorrarSel").onclick = async () => {
    const ids = Array.from(seleccionadas);
    if (!ids.length) return;
    if (!await confirmar(`¿Borrar ${ids.length} falla${ids.length > 1 ? "s" : ""} con todas sus acciones? Esto no se puede deshacer.`, { ok: "Borrar", danger: true })) return;
    for (const id of ids) {
      await sb.from("acciones").delete().eq("falla_id", id);
      await sb.from("mdas_fallas").delete().eq("id", id);
    }
    audit("borrar_fallas_masivo", { total: ids.length, ids });
    toast(`${ids.length} falla${ids.length > 1 ? "s" : ""} borrada${ids.length > 1 ? "s" : ""}`);
    cargarObrist();
    cargarLista();
  };

  pintarFallas();
}
