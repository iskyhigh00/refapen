async function cargarAdmin() {
  const body = $("adminBody");
  body.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const [{ data: tecs }, { data: cats }] = await Promise.all([
    sb.from("tecnicos").select("*").order("nombre"),
    sb.from("catalogo_acciones").select("*").order("categoria").order("accion")
  ]);
  body.innerHTML = "";

  // TÉCNICOS
  const secTec = document.createElement("div");
  secTec.className = "admin-section";
  secTec.innerHTML = `<h3>Técnicos</h3><div id="listaTec"></div>`;
  const addTecRow = document.createElement("div");
  addTecRow.style.cssText = "display:flex;gap:8px;margin-top:12px";
  addTecRow.innerHTML = `<input id="nuevoTec" placeholder="Nombre del técnico" style="margin:0"><button class="btn btn-ok btn-sm" id="btnAddTec" style="white-space:nowrap">+ Agregar</button>`;
  secTec.appendChild(addTecRow);
  body.appendChild(secTec);

  function pintarTecs(tecs) {
    const lista = $("listaTec");
    lista.innerHTML = "";
    tecs.forEach(t => {
      const row = document.createElement("div");
      row.className = "admin-item";
      row.innerHTML = `<span style="${t.activo ? '' : 'text-decoration:line-through;color:var(--muted)'}">${esc(t.nombre)}</span>
        <button class="btn-icon btn-edit" data-edit-tec="${t.id}" data-nombre="${esc(t.nombre)}">✏️</button>
        <button class="btn-icon btn-del" data-del-tec="${t.id}" data-activo="${t.activo}">${t.activo ? '🗑️' : '↩️'}</button>`;
      lista.appendChild(row);
    });
    lista.querySelectorAll("[data-edit-tec]").forEach(b => b.onclick = async () => {
      const nuevo = prompt("Nuevo nombre:", b.dataset.nombre); if (!nuevo) return;
      await sb.from("tecnicos").update({ nombre: nuevo }).eq("id", b.dataset.editTec);
      audit("editar_tecnico", { id: b.dataset.editTec, nuevo });
      cargarAdmin(); cargarMaestros();
    });
    lista.querySelectorAll("[data-del-tec]").forEach(b => b.onclick = async () => {
      const activo = b.dataset.activo === "true";
      await sb.from("tecnicos").update({ activo: !activo }).eq("id", b.dataset.delTec);
      audit(activo ? "desactivar_tecnico" : "activar_tecnico", { id: b.dataset.delTec });
      cargarAdmin(); cargarMaestros();
    });
  }
  pintarTecs(tecs || []);
  $("btnAddTec").onclick = async () => {
    const nombre = $("nuevoTec").value.trim(); if (!nombre) return;
    await sb.from("tecnicos").insert({ nombre, activo: true });
    audit("agregar_tecnico", { nombre });
    $("nuevoTec").value = ""; cargarAdmin(); cargarMaestros();
  };

  // CATÁLOGO DE ACCIONES
  const secCat = document.createElement("div");
  secCat.className = "admin-section";
  secCat.innerHTML = `<h3>Catálogo de acciones</h3>
    <div style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap">
      <input id="nuevaAcc" placeholder="Nombre de la acción" style="margin:0;flex:1;min-width:200px">
      <div style="position:relative;flex:1;min-width:150px">
        <input id="nuevaCat" placeholder="Categoría" style="margin:0;width:100%" autocomplete="off">
        <div id="catSugg" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--panel);border:1px solid var(--border);border-radius:8px;z-index:10;max-height:200px;overflow-y:auto"></div>
      </div>
      <button class="btn btn-ok btn-sm" id="btnAddAcc" style="white-space:nowrap">+ Agregar</button>
    </div>
    <div id="accPreview" style="font-size:13px;margin-bottom:8px;min-height:20px"></div>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn btn-sec btn-sm" id="btnExport" style="margin-top:0">↓ Exportar JSON</button>
      <label class="btn btn-sec btn-sm" style="margin-top:0;cursor:pointer">↑ Importar JSON<input type="file" id="btnImport" accept=".json" style="display:none"></label>
    </div>
    <div id="listaAcc"></div>`;
  body.appendChild(secCat);

  function pintarAcciones(cats) {
    const lista = $("listaAcc");
    lista.innerHTML = "";
    const grupos = {};
    cats.forEach(c => { (grupos[c.categoria] = grupos[c.categoria] || []).push(c); });
    Object.entries(grupos).forEach(([cat, items]) => {
      const catHead = document.createElement("div");
      catHead.style.cssText = "font-size:12px;font-weight:700;color:var(--muted);padding:10px 0 4px;text-transform:uppercase;letter-spacing:.5px";
      catHead.textContent = cat;
      lista.appendChild(catHead);
      items.forEach(c => {
        const row = document.createElement("div");
        row.className = "admin-item";
        row.innerHTML = `<span style="${c.activa ? '' : 'text-decoration:line-through;color:var(--muted)'}">${esc(c.accion)}</span>
          <button class="btn-icon btn-edit" data-edit-acc="${c.id}" data-val="${esc(c.accion)}">✏️</button>
          <button class="btn-icon btn-del" data-del-acc="${c.id}" data-activa="${c.activa}">${c.activa ? '🗑️' : '↩️'}</button>`;
        lista.appendChild(row);
      });
    });
    lista.querySelectorAll("[data-edit-acc]").forEach(b => b.onclick = async () => {
      const nuevo = prompt("Nueva descripción:", b.dataset.val); if (!nuevo) return;
      await sb.from("catalogo_acciones").update({ accion: nuevo }).eq("id", b.dataset.editAcc);
      audit("editar_accion_catalogo", { id: b.dataset.editAcc, nuevo });
      cargarAdmin(); cargarMaestros();
    });
    lista.querySelectorAll("[data-del-acc]").forEach(b => b.onclick = async () => {
      const activa = b.dataset.activa === "true";
      await sb.from("catalogo_acciones").update({ activa: !activa }).eq("id", b.dataset.delAcc);
      audit(activa ? "desactivar_accion" : "activar_accion", { id: b.dataset.delAcc });
      cargarAdmin(); cargarMaestros();
    });
  }
  pintarAcciones(cats || []);

  $("nuevaAcc").oninput = () => {
    const q = $("nuevaAcc").value.trim().toLowerCase();
    const prev = $("accPreview");
    if (!q) { prev.innerHTML = ""; pintarAcciones(cats || []); return; }
    const coincidencias = cats.filter(c => c.accion.toLowerCase().includes(q));
    if (!coincidencias.length) { prev.innerHTML = `<span style="color:var(--ok)">✓ No existe en el catálogo</span>`; pintarAcciones([]); return; }
    prev.innerHTML = `<span style="color:var(--warn)">⚠ Ya existe ${coincidencias.length} coincidencia${coincidencias.length > 1 ? "s" : ""}</span>`;
    pintarAcciones(coincidencias);
  };

  const catsList = [...new Set((cats || []).map(c => c.categoria))].sort();
  $("nuevaCat").oninput = () => {
    const q = $("nuevaCat").value.trim().toLowerCase();
    const sugg = $("catSugg");
    if (!q) { sugg.style.display = "none"; pintarAcciones(cats || []); return; }
    const catMatch = catsList.filter(c => c.toLowerCase().includes(q));
    const exacta = catsList.find(c => c.toLowerCase() === q);
    if (exacta) pintarAcciones((cats || []).filter(c => c.categoria === exacta));
    else pintarAcciones(cats || []);
    sugg.innerHTML = "";
    catMatch.forEach(c => {
      const it = document.createElement("div");
      it.style.cssText = "padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid var(--border)";
      it.textContent = c;
      it.onmousedown = () => { $("nuevaCat").value = c; sugg.style.display = "none"; pintarAcciones((cats || []).filter(x => x.categoria === c)); };
      sugg.appendChild(it);
    });
    if (!catMatch.length) {
      const it = document.createElement("div");
      it.style.cssText = "padding:10px 14px;cursor:pointer;font-size:14px;color:var(--ok)";
      it.textContent = `+ Crear categoría "${$("nuevaCat").value.trim()}"`;
      it.onmousedown = () => { sugg.style.display = "none"; };
      sugg.appendChild(it);
    }
    sugg.style.display = "block";
  };
  $("nuevaCat").onblur = () => setTimeout(() => $("catSugg").style.display = "none", 150);
  $("nuevaCat").onfocus = () => { if ($("nuevaCat").value) $("nuevaCat").oninput(); };

  $("btnExport").onclick = () => {
    const data = (cats || []).map(c => ({ categoria: c.categoria, accion: c.accion, activa: c.activa }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "catalogo_acciones.json"; a.click();
    audit("exportar_catalogo", { total: data.length });
  };

  $("btnImport").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { toast("JSON inválido"); return; }
    if (!Array.isArray(data) || !data[0]?.accion || !data[0]?.categoria) { toast("Formato incorrecto"); return; }
    const existentes = new Set((cats || []).map(c => c.accion.toLowerCase()));
    const nuevos = data.filter(d => !existentes.has(d.accion.toLowerCase()));
    if (!nuevos.length) { toast("Ninguna acción nueva"); return; }
    if (!confirm(`¿Importar ${nuevos.length} acciones nuevas?`)) return;
    const { error } = await sb.from("catalogo_acciones").insert(nuevos.map(d => ({ categoria: d.categoria, accion: d.accion, activa: d.activa !== false })));
    if (error) { toast("Error al importar"); return; }
    audit("importar_catalogo", { total: nuevos.length });
    toast(`${nuevos.length} acciones importadas`);
    cargarAdmin(); cargarMaestros();
  };

  $("btnAddAcc").onclick = async () => {
    const acc = $("nuevaAcc").value.trim(); const cat = $("nuevaCat").value.trim();
    if (!acc || !cat) { toast("Falta nombre o categoría"); return; }
    await sb.from("catalogo_acciones").insert({ categoria: cat, accion: acc, activa: true });
    audit("agregar_accion_catalogo", { accion: acc, categoria: cat });
    $("nuevaAcc").value = ""; cargarAdmin(); cargarMaestros();
  };
}
