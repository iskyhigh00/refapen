async function cargarObrist() {
  const body = $("obristBody");
  body.innerHTML = '<p style="color:var(--muted)">Cargando…</p>';
  const { data: fallas } = await sb.from("mdas_fallas").select("*").order("created_at", { ascending: false });
  body.innerHTML = "";

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
    if (!confirm(`¿Crear ${csvRows.length} fallas con "${falla}"?`)) return;
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
  secBorrar.innerHTML = `<h3>Borrar fallas</h3><div id="listaObrist"></div>`;
  body.appendChild(secBorrar);

  const lista = secBorrar.querySelector("#listaObrist");
  if (!fallas?.length) { lista.innerHTML = '<p style="color:var(--muted);font-size:13px">No hay fallas registradas.</p>'; return; }

  fallas.forEach(f => {
    const row = document.createElement("div");
    row.className = "admin-item";
    const estColor = { pendiente: "var(--warn)", observacion: "var(--accent)", resuelta: "var(--ok)" }[f.estado] || "var(--muted)";
    row.innerHTML = `
      <span style="flex:1">
        <b>MDA ${f.mda}</b> isla ${f.isla}<br>
        <span style="font-size:12px;color:var(--muted)">${esc(f.falla)}</span>
      </span>
      <span style="font-size:11px;color:${estColor};margin-right:8px;white-space:nowrap">${f.estado}</span>
      <button class="btn-icon btn-del" data-del="${f.id}" title="Borrar">🗑️</button>`;
    lista.appendChild(row);
  });

  lista.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    const fila = b.closest(".admin-item");
    const nombre = fila.querySelector("b").textContent;
    if (!confirm(`¿Borrar ${nombre} con todas sus acciones? Esto no se puede deshacer.`)) return;
    const { error } = await sb.from("acciones").delete().eq("falla_id", b.dataset.del);
    if (!error) await sb.from("mdas_fallas").delete().eq("id", b.dataset.del);
    audit("borrar_falla", { falla_id: b.dataset.del });
    toast("Falla borrada"); cargarObrist(); cargarLista();
  });
}
