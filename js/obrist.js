async function cargarObrist() {
  const body = $("obristBody");
  body.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data: fallas } = await sb.from("mdas_fallas").select("*").order("created_at", { ascending: false });
  body.innerHTML = "";

  // TEMA
  const TEMAS = [
    { id: "oscuro", nombre: "Oscuro", bg: "#0d1117", txt: "#e6edf3", accent: "#2f81f7" },
    { id: "medianoche", nombre: "Violeta", bg: "#0b0e14", txt: "#d4dae3", accent: "#7c3aed" },
    { id: "oceano", nombre: "Océano", bg: "#0f172a", txt: "#e2e8f0", accent: "#06b6d4" },
    { id: "claro", nombre: "Claro", bg: "#f5f6f8", txt: "#1f2937", accent: "#2563eb" },
    { id: "arena", nombre: "Arena", bg: "#faf6f1", txt: "#3d3529", accent: "#b45309" }
  ];
  const temaActual = localStorage.getItem("tema_fallas") || "oscuro";

  const secTema = document.createElement("div");
  secTema.className = "admin-section";
  secTema.innerHTML = `<h3>Tema visual</h3><div class="theme-grid" id="themeGrid"></div>`;
  body.appendChild(secTema);

  const grid = secTema.querySelector("#themeGrid");
  TEMAS.forEach(t => {
    const btn = document.createElement("div");
    btn.className = "theme-btn" + (t.id === temaActual ? " active" : "");
    btn.style.background = t.bg;
    btn.style.color = t.txt;
    btn.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:${t.accent};margin:0 auto 6px"></div>${t.nombre}`;
    btn.onclick = () => {
      document.documentElement.setAttribute("data-theme", t.id);
      localStorage.setItem("tema_fallas", t.id);
      grid.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      audit("cambiar_tema", { tema: t.id });
    };
    grid.appendChild(btn);
  });

  // CARGA MASIVA
  const secMasiva = document.createElement("div");
  secMasiva.className = "admin-section";
  secMasiva.innerHTML = `
    <h3>Carga masiva de fallas</h3>
    <p style="font-size:13px;color:var(--muted);margin-bottom:12px">CSV con columnas: <b>mda,isla</b> — separadas por coma, sin cabecera. Se crea la misma falla para todas.</p>
    <textarea id="csvFalla" placeholder="pérdida de imagen en pantalla superior" style="min-height:48px;margin-bottom:8px"></textarea>
    <label style="margin-top:0;font-size:13px;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Pegar desde Excel (MDA · isla por fila)</label>
    <textarea id="excelPaste" placeholder="100011&#9;113&#10;100234&#9;045&#10;..." style="min-height:80px;margin-bottom:8px;font-family:monospace;font-size:13px"></textarea>
    <label class="btn btn-sec btn-sm" style="margin-top:0;cursor:pointer;display:inline-block">
      ↑ O subir CSV
      <input type="file" id="csvFile" accept=".csv,.txt" style="display:none">
    </label>
    <div id="csvPreview" style="margin-top:12px;font-size:13px;color:var(--muted)"></div>
    <button class="btn btn-ok" id="btnCargaMasiva" style="display:none">Crear fallas</button>`;
  body.appendChild(secMasiva);

  let csvRows = [];

  function parsearFilas(txt) {
    return txt.trim().split("\n").map(l => {
      const parts = l.split(/\t|,| {2,}/).map(s => s.trim().replace(/^"|"$/g, ""));
      return { mda: mda6(parts[0] || ""), isla: (parts[1] || "").replace(/\D/g, "") };
    }).filter(r => r.mda.length === 6 && r.isla);
  }

  function actualizarPreview() {
    if (!csvRows.length) { $("csvPreview").textContent = ""; $("btnCargaMasiva").style.display = "none"; return; }
    $("csvPreview").innerHTML = `<b>${csvRows.length} máquinas</b>: ` + csvRows.slice(0, 5).map(r => `MDA ${r.mda} isla ${r.isla}`).join(", ") + (csvRows.length > 5 ? ` y ${csvRows.length - 5} más` : "");
    $("btnCargaMasiva").style.display = "block";
  }

  $("excelPaste").oninput = () => { csvRows = parsearFilas($("excelPaste").value); actualizarPreview(); };
  $("csvFile").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    csvRows = parsearFilas(await file.text());
    actualizarPreview();
  };
  $("btnCargaMasiva").onclick = async () => {
    const falla = $("csvFalla").value.trim();
    if (!falla) { toast("Escribe la descripción de la falla"); return; }
    if (!csvRows.length) { toast("Sube un CSV primero"); return; }
    if (!await confirmar(`¿Crear ${csvRows.length} fallas con "${falla}"?`, { ok: "Crear" })) return;
    const ts = new Date().toISOString();
    const inserts = csvRows.map(r => ({ mda: r.mda, isla: r.isla, falla, estado: "pendiente", tecnico, created_at: ts, updated_at: ts }));
    const { error } = await sb.from("mdas_fallas").insert(inserts);
    if (error) { toast("Error: " + error.message); return; }
    audit("carga_masiva", { total: inserts.length, falla });
    toast(`${inserts.length} fallas creadas`);
    csvRows = []; $("csvPreview").textContent = ""; $("csvFalla").value = ""; $("btnCargaMasiva").style.display = "none";
    cargarLista(); cargarObrist();
  };

  // BORRAR FALLAS
  const secBorrar = document.createElement("div");
  secBorrar.className = "admin-section";
  secBorrar.innerHTML = `
    <h3>Borrar fallas</h3>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-sec btn-sm" id="obSelTodas">Seleccionar todas</button>
      <button class="btn btn-sec btn-sm" id="obSelNinguna" style="display:none">Deseleccionar</button>
      <button class="btn btn-danger btn-sm" id="obBorrarSel" style="display:none">🗑️ Borrar seleccionadas (<span id="obSelCount">0</span>)</button>
    </div>
    <div id="listaObrist"></div>`;
  body.appendChild(secBorrar);

  const lista = secBorrar.querySelector("#listaObrist");
  if (!fallas?.length) { lista.innerHTML = '<p style="color:var(--muted);font-size:13px">No hay fallas registradas.</p>'; return; }

  const seleccionadas = new Set();

  function actualizarBarra() {
    const n = seleccionadas.size;
    secBorrar.querySelector("#obSelCount").textContent = n;
    secBorrar.querySelector("#obBorrarSel").style.display = n ? "inline-block" : "none";
    secBorrar.querySelector("#obSelNinguna").style.display = n ? "inline-block" : "none";
  }

  fallas.forEach(f => {
    const row = document.createElement("div");
    row.className = "admin-item";
    row.style.cursor = "pointer";
    const estColor = { pendiente: "var(--warn)", observacion: "var(--accent)", resuelta: "var(--ok)" }[f.estado] || "var(--muted)";
    row.innerHTML = `
      <input type="checkbox" data-check="${f.id}" style="width:20px;height:20px;margin-right:8px;flex:none;accent-color:var(--danger);cursor:pointer">
      <span style="flex:1">
        <b>MDA ${f.mda}</b> isla ${f.isla}<br>
        <span style="font-size:12px;color:var(--muted)">${esc(f.falla)}</span>
      </span>
      <span style="font-size:11px;color:${estColor};margin-right:8px;white-space:nowrap">${f.estado}</span>`;
    lista.appendChild(row);

    const cb = row.querySelector("input");
    cb.onchange = () => {
      if (cb.checked) seleccionadas.add(f.id);
      else seleccionadas.delete(f.id);
      row.style.background = cb.checked ? "rgba(218,54,51,.1)" : "";
      actualizarBarra();
    };
    row.onclick = e => { if (e.target !== cb) { cb.checked = !cb.checked; cb.onchange(); } };
  });

  // Seleccionar todas
  secBorrar.querySelector("#obSelTodas").onclick = () => {
    lista.querySelectorAll("input[data-check]").forEach(cb => {
      cb.checked = true;
      seleccionadas.add(cb.dataset.check);
      cb.closest(".admin-item").style.background = "rgba(218,54,51,.1)";
    });
    actualizarBarra();
  };

  // Deseleccionar
  secBorrar.querySelector("#obSelNinguna").onclick = () => {
    lista.querySelectorAll("input[data-check]").forEach(cb => {
      cb.checked = false;
      cb.closest(".admin-item").style.background = "";
    });
    seleccionadas.clear();
    actualizarBarra();
  };

  // Borrar seleccionadas
  secBorrar.querySelector("#obBorrarSel").onclick = async () => {
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
}
