const accSel = {};
const accTime = {};
const elegirCallbacks = {};

function abrirSelectorTiempo(fid, btnRef) {
  const OPCIONES = [
    { label: "15 min",  ms: 15 * 60000 },
    { label: "30 min",  ms: 30 * 60000 },
    { label: "1 hora",  ms: 3600000 },
    { label: "2 horas", ms: 2 * 3600000 },
    { label: "3 horas", ms: 3 * 3600000 },
    { label: "6 horas", ms: 6 * 3600000 },
    { label: "12 horas",ms: 12 * 3600000 },
    { label: "1 día",   ms: 24 * 3600000 },
  ];
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px";
  const box = document.createElement("div");
  box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:320px";
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  box.innerHTML = `
    <div style="font-size:15px;font-weight:700;margin-bottom:4px">⏱ ¿Cuándo lo hiciste?</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px">La acción se registrará con esa fecha y hora</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px" id="stOpts"></div>
    <div style="border-top:1px solid var(--border);padding-top:14px;margin-bottom:14px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">O elige fecha y hora exactas:</div>
      <input type="datetime-local" id="stCustom" value="${nowStr}" style="margin-bottom:8px">
      <button class="btn btn-sec btn-sm" id="stCustomOk" style="margin:0">Usar esta fecha</button>
    </div>
    <button class="btn btn-sec btn-sm" id="stAhora" style="margin:0">✕ Volver a "Ahora"</button>`;
  ov.appendChild(box); document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) ov.remove(); };

  function seleccionar(fecha, label) {
    accTime[fid] = fecha.toISOString();
    btnRef.textContent = `⏱ Hace ${label}`;
    btnRef.style.cssText = "margin:0;font-size:12px;color:var(--warn);border-color:var(--warn)";
    ov.remove();
  }

  const optsEl = box.querySelector("#stOpts");
  OPCIONES.forEach(o => {
    const b = document.createElement("button");
    b.className = "btn btn-sec btn-sm"; b.style.margin = "0";
    b.textContent = `Hace ${o.label}`;
    b.onclick = () => seleccionar(new Date(Date.now() - o.ms), o.label);
    optsEl.appendChild(b);
  });

  box.querySelector("#stCustomOk").onclick = () => {
    const val = box.querySelector("#stCustom").value;
    if (!val) { toast("Elige una fecha"); return; }
    const fecha = new Date(val);
    if (isNaN(fecha)) { toast("Fecha inválida"); return; }
    if (fecha > new Date()) { toast("No puede ser en el futuro"); return; }
    seleccionar(fecha, fmtFecha(fecha.toISOString()));
  };

  box.querySelector("#stAhora").onclick = () => {
    accTime[fid] = null;
    btnRef.textContent = "⏱ Ahora";
    btnRef.style.cssText = "margin:0;font-size:12px";
    ov.remove();
  };
}

async function editarFalla(f) {
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px";
  const box = document.createElement("div");
  box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:400px;max-height:92vh;overflow-y:auto";
  const tecOpts = TECNICOS.map(t => `<option value="${esc(t)}"${t===f.tecnico?" selected":""}>${esc(t)}</option>`).join("");
  const toLocal = iso => { const d = new Date(iso); const pad = n => String(n).padStart(2,"0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  box.innerHTML = `
    <div style="font-size:15px;font-weight:700;margin-bottom:16px">✏️ Editar falla</div>
    <label>Descripción</label>
    <textarea id="edFalla" style="min-height:60px">${esc(f.falla)}</textarea>
    <label>Estado</label>
    <select id="edEstado">
      <option value="pendiente"${f.estado==="pendiente"?" selected":""}>Pendiente</option>
      <option value="observacion"${f.estado==="observacion"?" selected":""}>En observación</option>
      <option value="resuelta"${f.estado==="resuelta"?" selected":""}>Resuelta</option>
    </select>
    <label>Técnico</label>
    <select id="edTecnico">${tecOpts}</select>
    <label>MDA</label>
    <input id="edMda" value="${esc(f.mda)}" inputmode="numeric" maxlength="6">
    <label>Isla</label>
    <input id="edIsla" value="${esc(f.isla)}">
    <label>Inicio de la falla</label>
    <input type="datetime-local" id="edInicioAt" value="${toLocal(f.inicio_at || f.created_at)}">
    <label>Última actualización</label>
    <input type="datetime-local" id="edUpdatedAt" value="${toLocal(f.updated_at)}">
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-ok" id="edGuardar" style="margin:0">Guardar</button>
      <button class="btn btn-sec" id="edCancelar" style="margin:0">Cancelar</button>
    </div>`;
  ov.appendChild(box); document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  box.querySelector("#edCancelar").onclick = () => ov.remove();
  box.querySelector("#edGuardar").onclick = async () => {
    const falla = box.querySelector("#edFalla").value.trim();
    const estado = box.querySelector("#edEstado").value;
    const tecnicoVal = box.querySelector("#edTecnico").value;
    const mdaVal = mda6(box.querySelector("#edMda").value);
    const islaVal = box.querySelector("#edIsla").value.trim();
    const inicioAt = new Date(box.querySelector("#edInicioAt").value).toISOString();
    const updatedAt = new Date(box.querySelector("#edUpdatedAt").value).toISOString();
    if (!falla) { toast("La descripción no puede estar vacía"); return; }
    const { error } = await sb.from("mdas_fallas").update({ falla, estado, tecnico: tecnicoVal, mda: mdaVal, isla: islaVal, inicio_at: inicioAt, updated_at: updatedAt }).eq("id", f.id);
    if (error) { toast("Error: " + error.message); return; }
    audit("editar_falla", { id: f.id, falla, estado, mda: mdaVal });
    toast("Guardado");
    ov.remove();
    cargarLista();
    abrirMda(mdaVal);
  };
}

async function editarAccion(a, mdaNum) {
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px";
  const box = document.createElement("div");
  box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:380px";
  const tecOpts = TECNICOS.map(t => `<option value="${esc(t)}"${t===a.tecnico?" selected":""}>${esc(t)}</option>`).join("");
  const toLocal = iso => { const d = new Date(iso); const pad = n => String(n).padStart(2,"0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  box.innerHTML = `
    <div style="font-size:15px;font-weight:700;margin-bottom:16px">✏️ Editar acción</div>
    <label>Texto</label>
    <input id="eaAccion" value="${esc(a.accion)}">
    <label>Resultado</label>
    <select id="eaResultado">
      <option value="resolvio"${a.resultado==="resolvio"?" selected":""}>Resolvió ✓</option>
      <option value="no_resolvio"${a.resultado==="no_resolvio"?" selected":""}>No resolvió ✗</option>
      <option value="pendiente"${a.resultado==="pendiente"?" selected":""}>Pendiente →</option>
    </select>
    <label>Técnico</label>
    <select id="eaTecnico">${tecOpts}</select>
    <label>Fecha y hora</label>
    <input type="datetime-local" id="eaCreatedAt" value="${toLocal(a.created_at)}">
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn btn-ok" id="eaGuardar" style="margin:0">Guardar</button>
      <button class="btn btn-danger" id="eaAnular" style="margin:0">Anular</button>
      <button class="btn btn-sec" id="eaCancelar" style="margin:0">Cancelar</button>
    </div>`;
  ov.appendChild(box); document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  box.querySelector("#eaCancelar").onclick = () => ov.remove();
  box.querySelector("#eaGuardar").onclick = async () => {
    const accion = box.querySelector("#eaAccion").value.trim();
    const resultado = box.querySelector("#eaResultado").value;
    const tecnicoVal = box.querySelector("#eaTecnico").value;
    const createdAt = new Date(box.querySelector("#eaCreatedAt").value).toISOString();
    if (!accion) { toast("El texto no puede estar vacío"); return; }
    const { error } = await sb.from("acciones").update({ accion, resultado, tecnico: tecnicoVal, created_at: createdAt, anulada: false }).eq("id", a.id);
    if (error) { toast("Error: " + error.message); return; }
    audit("editar_accion", { id: a.id, accion, resultado });
    toast("Guardado"); ov.remove(); abrirMda(mdaNum);
  };
  box.querySelector("#eaAnular").onclick = async () => {
    if (!await confirmar("¿Anular esta acción? Quedará tachada pero visible en el historial.", { ok: "Anular", danger: true })) return;
    await sb.from("acciones").update({ anulada: true }).eq("id", a.id);
    audit("anular_accion_obrist", { id: a.id });
    toast("Anulada"); ov.remove(); abrirMda(mdaNum);
  };
}

async function buscarSugerencias(fallaTexto, fallaId) {
  if (!navigator.onLine) return [];
  const palabras = fallaTexto.toLowerCase().replace(/[^a-záéíóúñü0-9\s]/g, "").split(/\s+/).filter(p => p.length > 2);
  if (!palabras.length) return [];

  const { data: resueltas } = await sb.from("mdas_fallas").select("id, falla").eq("estado", "resuelta").neq("id", fallaId);
  if (!resueltas || !resueltas.length) return [];

  const scored = resueltas.map(r => {
    const txt = r.falla.toLowerCase();
    const hits = palabras.filter(p => txt.includes(p)).length;
    return { id: r.id, falla: r.falla, score: hits / palabras.length };
  }).filter(r => r.score >= 0.4).sort((a, b) => b.score - a.score).slice(0, 10);

  if (!scored.length) return [];

  const ids = scored.map(r => r.id);
  const { data: acciones } = await sb.from("acciones").select("accion, resultado, falla_id").in("falla_id", ids).eq("resultado", "resolvio").eq("anulada", false);
  if (!acciones || !acciones.length) return [];

  const conteo = {};
  acciones.forEach(a => {
    if (!conteo[a.accion]) conteo[a.accion] = { accion: a.accion, veces: 0, fallas: new Set() };
    conteo[a.accion].veces++;
    conteo[a.accion].fallas.add(a.falla_id);
  });

  const minSug = getCfg("min_sugerencias", 1);
  return Object.values(conteo)
    .filter(c => c.veces >= minSug)
    .map(c => ({ accion: c.accion, veces: c.veces, enFallas: c.fallas.size }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 5);
}

function mostrarOverlayCambio(acc, callback) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px";
  const box = document.createElement("div");
  box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:360px";
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  function paso1() {
    box.innerHTML = `
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(acc)}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px">¿La pieza es nueva o usada?</div>
      <button class="btn btn-ok" style="margin-top:0">Nueva</button>
      <button class="btn btn-sec" style="margin-top:10px">Usada</button>
      <button class="btn btn-sec" style="margin-top:10px;font-size:13px;color:var(--muted)">Cancelar</button>`;
    const btns = box.querySelectorAll("button");
    btns[0].onclick = () => { overlay.remove(); callback(acc + " (nueva)"); };
    btns[1].onclick = paso2;
    btns[2].onclick = () => overlay.remove();
  }

  function paso2() {
    box.innerHTML = `
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(acc)}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px">¿La pieza usada está probada o es dudosa?</div>
      <button class="btn" style="margin-top:0;background:var(--ok);color:#fff">Probada</button>
      <button class="btn btn-danger" style="margin-top:10px">Dudosa</button>
      <button class="btn btn-sec" style="margin-top:10px;font-size:13px;color:var(--muted)">Cancelar</button>`;
    const btns = box.querySelectorAll("button");
    btns[0].onclick = () => { overlay.remove(); callback(acc + " (usada - probada)"); };
    btns[1].onclick = () => { overlay.remove(); callback(acc + " (usada - dudosa)"); };
    btns[2].onclick = () => overlay.remove();
  }

  paso1();
}

function mostrarOverlayFirmware(acc, callback) {
  const key = "fw_versions_" + acc;
  const versiones = JSON.parse(localStorage.getItem(key) || "[]");

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px";
  const box = document.createElement("div");
  box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:360px";
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  function pintar() {
    let html = `
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(acc)}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px">¿Qué versión?</div>`;
    versiones.forEach(v => {
      html += `<button class="btn btn-sec fw-ver" style="margin-top:8px">${esc(v)}</button>`;
    });
    html += `
      <input type="text" id="fwNuevaVer" placeholder="Escribir nueva versión…" style="margin-top:12px">
      <button class="btn btn-ok" id="fwGuardar" style="margin-top:10px">Guardar</button>
      <button class="btn btn-sec" id="fwCancelar" style="margin-top:10px;font-size:13px;color:var(--muted)">Cancelar</button>`;
    box.innerHTML = html;

    box.querySelectorAll(".fw-ver").forEach(b => {
      b.onclick = () => { overlay.remove(); callback(acc + " (" + b.textContent + ")"); };
    });
    box.querySelector("#fwGuardar").onclick = () => {
      const ver = box.querySelector("#fwNuevaVer").value.trim();
      if (!ver) { toast("Escribe una versión"); return; }
      if (!versiones.includes(ver)) {
        versiones.push(ver);
        localStorage.setItem(key, JSON.stringify(versiones));
      }
      overlay.remove();
      callback(acc + " (" + ver + ")");
    };
    box.querySelector("#fwCancelar").onclick = () => overlay.remove();
  }

  pintar();
}

// — Fotos —

async function comprimirImagen(file, maxAncho = 1200) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxAncho) { h = h * maxAncho / w; w = maxAncho; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
}

async function subirFoto(fallaId, file) {
  toast("Subiendo foto…");
  const blob = await comprimirImagen(file);
  const path = `${fallaId}/${Date.now()}.jpg`;
  if (!navigator.onLine) {
    toast("Sin conexión · la foto se subirá al reconectar");
    const reader = new FileReader();
    reader.onload = () => {
      cola.push({ id: uid(), t: "foto", d: { fallaId, path, base64: reader.result } });
      guardarCola();
    };
    reader.readAsDataURL(blob);
    return;
  }
  const { error } = await sb.storage.from("fotos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) {
    if (error.message?.includes("not found") || error.statusCode === 404) {
      toast("Crea el bucket 'fotos' en Supabase Storage");
    } else {
      toast("Error al subir · se reintentará al reconectar");
      const reader = new FileReader();
      reader.onload = () => {
        cola.push({ id: uid(), t: "foto", d: { fallaId, path, base64: reader.result } });
        guardarCola();
      };
      reader.readAsDataURL(blob);
    }
    return;
  }
  audit("subir_foto", { falla_id: fallaId });
  toast("Foto guardada");
  cargarFotos(fallaId);
}

async function cargarSugerencias(fallaId, fallaTexto, boxDirecto) {
  const box = boxDirecto || document.querySelector(`[data-sug="${fallaId}"]`);
  if (!box) return;
  const sugs = await buscarSugerencias(fallaTexto, fallaId);
  if (!sugs.length) return;
  const wrap = document.createElement("div");
  wrap.style.cssText = "background:var(--panel2);border:1px solid var(--accent);border-radius:10px;padding:12px;margin-bottom:12px";
  wrap.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">💡 Sugerencias basadas en fallas similares resueltas</div>`;
  sugs.forEach(s => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid var(--border);gap:8px";
    row.innerHTML = `
      <span style="font-size:13px;flex:1">${esc(s.accion)}</span>
      <span style="font-size:11px;color:var(--ok);white-space:nowrap">resolvió ${s.veces}× en ${s.enFallas} falla${s.enFallas > 1 ? "s" : ""}</span>
      <button class="btn btn-ok" style="padding:4px 10px;font-size:12px;margin:0;white-space:nowrap" data-usar="${esc(s.accion)}">Usar ▶</button>`;
    wrap.appendChild(row);
  });
  const nota = document.createElement("div");
  nota.style.cssText = "font-size:10px;color:var(--muted);margin-top:6px";
  nota.textContent = "Basado en el historial de fallas similares";
  wrap.appendChild(nota);
  box.innerHTML = "";
  box.appendChild(wrap);

  wrap.querySelectorAll("[data-usar]").forEach(btn => {
    btn.onclick = () => {
      const acc = btn.dataset.usar;
      const toggleEl = document.querySelector(`[data-toggle-acc="${fallaId}"]`);
      const bodyEl = document.querySelector(`[data-accbody="${fallaId}"]`);
      if (bodyEl && bodyEl.classList.contains("hidden")) {
        bodyEl.classList.remove("hidden");
        if (toggleEl) toggleEl.querySelector(".arr").style.transform = "rotate(90deg)";
      }
      if (elegirCallbacks[fallaId]) {
        elegirCallbacks[fallaId](acc);
        btn.textContent = "✓ Añadida";
        btn.disabled = true;
        btn.style.background = "var(--ok)";
      }
    };
  });
}

async function cargarFotos(fallaId, gridDirecto) {
  const grid = gridDirecto || document.querySelector(`[data-fotos="${fallaId}"]`);
  if (!grid) return;
  if (!navigator.onLine) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:12px">Sin conexión para cargar fotos</p>';
    return;
  }
  try {
    const { data, error } = await sb.storage.from("fotos").list(String(fallaId), { sortBy: { column: "created_at", order: "desc" } });
    if (error) { grid.innerHTML = '<p style="color:var(--danger);font-size:12px">Error cargando fotos</p>'; return; }
    const fotos = (data || []).filter(f => f.name && !f.name.startsWith("."));
    if (!fotos.length) { grid.innerHTML = ""; return; }
    grid.innerHTML = "";
    const urls = fotos.map(f => sb.storage.from("fotos").getPublicUrl(`${fallaId}/${f.name}`).data.publicUrl);
    fotos.forEach((f, idx) => {
      const img = document.createElement("img");
      img.src = urls[idx];
      img.className = "foto-thumb";
      img.onerror = () => { img.style.display = "none"; };
      img.onclick = ev => { ev.stopPropagation(); abrirGaleria(urls.filter((_, i) => document.querySelectorAll(`[data-fotos="${fallaId}"] img`)[i]?.style.display !== "none"), idx); };
      grid.appendChild(img);
    });
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--danger);font-size:12px">Error cargando fotos</p>';
  }
}

function abrirGaleria(urls, index) {
  let actual = index;
  const ov = document.createElement("div");
  ov.className = "foto-overlay";
  ov.innerHTML = `
    <button class="gal-btn gal-prev">‹</button>
    <img src="${urls[actual]}">
    <button class="gal-btn gal-next">›</button>
    <div class="gal-counter">${actual + 1} / ${urls.length}</div>
    <button class="gal-close">✕</button>`;
  document.body.appendChild(ov);

  const img = ov.querySelector("img");
  const counter = ov.querySelector(".gal-counter");
  const prev = ov.querySelector(".gal-prev");
  const next = ov.querySelector(".gal-next");

  function mostrar() {
    img.src = urls[actual];
    counter.textContent = `${actual + 1} / ${urls.length}`;
    prev.style.visibility = actual > 0 ? "visible" : "hidden";
    next.style.visibility = actual < urls.length - 1 ? "visible" : "hidden";
  }

  prev.onclick = e => { e.stopPropagation(); actual--; mostrar(); };
  next.onclick = e => { e.stopPropagation(); actual++; mostrar(); };
  ov.querySelector(".gal-close").onclick = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) ov.remove(); };

  // Swipe táctil
  let startX = 0;
  ov.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
  ov.addEventListener("touchend", e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 60 && actual > 0) { actual--; mostrar(); }
    else if (diff < -60 && actual < urls.length - 1) { actual++; mostrar(); }
  });

  mostrar();
}

function exportarInformeFalla(f, acciones) {
  const estLabel = { pendiente: "Pendiente", observacion: "En observación", resuelta: "Resuelta" }[f.estado] || f.estado;
  const accsNoAnuladas = acciones.filter(a => !a.anulada);
  const accsAnuladas = acciones.filter(a => a.anulada);

  const filaAcc = a => {
    const resText = a.accion === "⟲ Volvió a fallar" || a.accion.startsWith("⟲") ? "reincidencia"
      : a.resultado === "resolvio" ? "Resolvió ✓"
      : a.resultado === "no_resolvio" ? "No resolvió ✗"
      : "Pendiente de probar →";
    const hist = a.historial_resultados
      ? `<div style="font-size:11px;color:#666;margin-top:4px;padding-left:8px;border-left:2px solid #ddd">${a.historial_resultados.split(" → ").map((h,i)=>`${i+1}. ${h}`).join("<br>")}</div>`
      : "";
    return `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:13px">${esc(a.accion)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:13px;white-space:nowrap;font-weight:600;color:${a.resultado==="resolvio"?"#16a34a":a.resultado==="no_resolvio"?"#dc2626":"#d97706"}">${resText}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;white-space:nowrap">${esc(a.tecnico)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;white-space:nowrap">${fmtFecha(a.created_at)}</td>
    </tr>${hist ? `<tr><td colspan="4" style="padding:2px 10px 8px;border-bottom:1px solid #eee">${hist}</td></tr>` : ""}`;
  };

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Informe Falla MDA ${f.mda}</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a}
    h1{font-size:22px;margin-bottom:4px}
    .sub{color:#666;font-size:13px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#f4f4f4;padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #ddd}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700}
    .pendiente{background:#fef3c7;color:#92400e}
    .observacion{background:#dbeafe;color:#1e40af}
    .resuelta{background:#dcfce7;color:#166534}
    .section{margin-top:28px}
    .section h2{font-size:15px;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:0}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:12px;font-size:13px}
    .meta-grid dt{color:#666;margin:0}
    .meta-grid dd{margin:0;font-weight:500}
    .desc{background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:14px;font-size:15px;margin-top:12px}
    .anuladas{opacity:.6}
    @media print{body{margin:20px auto}.no-print{display:none}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:start">
    <div>
      <h1>Informe de Falla — MDA ${f.mda} · isla ${f.isla}</h1>
      <div class="sub">Generado el ${fmtFecha(new Date().toISOString())} · Fallas MDA</div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">🖨 Imprimir / PDF</button>
  </div>

  <div class="section">
    <h2>Datos generales</h2>
    <dl class="meta-grid">
      <dt>Estado</dt><dd><span class="badge ${f.estado}">${estLabel}</span></dd>
      <dt>MDA</dt><dd>${f.mda}</dd>
      <dt>Isla</dt><dd>${f.isla}</dd>
      <dt>Técnico que reportó</dt><dd>${esc(f.tecnico)}</dd>
      <dt>Inicio de la falla</dt><dd>${fmtFecha(f.inicio_at || f.created_at)}</dd>
      <dt>Registrada en el sistema</dt><dd>${fmtFecha(f.created_at)}</dd>
      <dt>Última actualización</dt><dd>${fmtFecha(f.updated_at)}</dd>
    </dl>
  </div>

  <div class="section">
    <h2>Descripción de la falla</h2>
    <div class="desc">${esc(f.falla)}</div>
  </div>

  ${accsNoAnuladas.length ? `
  <div class="section">
    <h2>Acciones registradas (${accsNoAnuladas.length})</h2>
    <table>
      <thead><tr><th>Acción</th><th>Resultado</th><th>Técnico</th><th>Fecha</th></tr></thead>
      <tbody>${accsNoAnuladas.map(filaAcc).join("")}</tbody>
    </table>
  </div>` : ""}

  ${accsAnuladas.length ? `
  <div class="section anuladas">
    <h2>Acciones anuladas (${accsAnuladas.length})</h2>
    <table>
      <thead><tr><th>Acción</th><th>Resultado</th><th>Técnico</th><th>Fecha</th></tr></thead>
      <tbody>${accsAnuladas.map(filaAcc).join("")}</tbody>
    </table>
  </div>` : ""}

  <div style="margin-top:40px;font-size:11px;color:#aaa;text-align:center">Fallas MDA · ${fmtFecha(new Date().toISOString())}</div>
  </body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
  else toast("Permite ventanas emergentes para exportar");
}

async function abrirMda(mdaNum) {
  mdaActual = mdaNum;
  abrirPantalla("scrMda");
  $("mdaTitulo").textContent = "MDA " + mdaNum;
  $("mdaTecBadge").textContent = tecnico;
  $("mdaBody").innerHTML = "<p style='color:var(--muted)'>Cargando…</p>";
  audit("abrir_mda", { mda: mdaNum });

  let fallas = [];
  if (navigator.onLine) {
    const { data } = await sb.from("mdas_fallas").select("*").eq("mda", mdaNum).order("created_at", { ascending: false });
    fallas = data || [];
  } else {
    const cached = JSON.parse(localStorage.getItem("cache_fallas") || "{}");
    fallas = (cached.data || cached || []).filter(f => f.mda === mdaNum);
  }

  // Mostrar isla en el título
  if (fallas.length && fallas[0].isla) {
    $("mdaTitulo").textContent = "MDA " + mdaNum + " · isla " + fallas[0].isla;
  }

  const body = $("mdaBody");
  body.innerHTML = "";

  // Separar activas y resueltas
  const activas = fallas.filter(f => f.estado !== "resuelta");
  const resueltas = fallas.filter(f => f.estado === "resuelta");

  // Fallas activas
  if (!activas.length && !resueltas.length) {
    body.innerHTML = '<p style="color:var(--muted)">Sin fallas registradas para esta MDA.</p>';
    return;
  }

  for (const f of activas) {
    let acciones = [];
    if (navigator.onLine) {
      const { data } = await sb.from("acciones").select("*").eq("falla_id", f.id).order("created_at", { ascending: true });
      acciones = data || [];
    }
    const fallaDiv = renderFalla(f, acciones);
    body.appendChild(fallaDiv);
    if (navigator.onLine) {
      const grid = fallaDiv.querySelector(`[data-fotos="${f.id}"]`);
      if (grid) await cargarFotos(f.id, grid);
      if (f.estado !== "resuelta") {
        const sugBox = fallaDiv.querySelector(`[data-sug="${f.id}"]`);
        cargarSugerencias(f.id, f.falla, sugBox);
      }
    }
  }

  // Historial de esta máquina
  if (resueltas.length) {
    const secHist = document.createElement("div");
    secHist.style.cssText = "margin-top:20px;border-top:2px solid var(--border);padding-top:16px";

    const toggle = document.createElement("div");
    toggle.style.cssText = "display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:8px 0";
    toggle.innerHTML = `<span style="font-size:15px;font-weight:700;color:var(--accent)">Historial de esta máquina (${resueltas.length})</span><span class="arr" style="color:var(--muted);transition:.2s;font-size:18px;transform:rotate(90deg)">›</span>`;

    const contenido = document.createElement("div");
    contenido.style.display = "block";

    async function cargarContenidoHistorial() {
      if (contenido.dataset.loaded) return;
      contenido.innerHTML = '<p style="color:var(--muted);font-size:13px">Cargando historial…</p>';
      contenido.dataset.loaded = "1";
      contenido.innerHTML = "";
      for (const f of resueltas) {
        let acciones = [];
        if (navigator.onLine) {
          const { data } = await sb.from("acciones").select("*").eq("falla_id", f.id).order("created_at", { ascending: true });
          acciones = data || [];
        }
        const card = document.createElement("div");
        card.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px;opacity:.85";
        let accsHtml = acciones.filter(a => !a.anulada).map(a => {
          const tag = a.resultado === "resolvio" ? "var(--ok)" : a.resultado === "no_resolvio" ? "var(--danger)" : "var(--warn)";
          return `<div style="font-size:12px;padding:4px 0;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center" ${isObrist?`data-hist-accid="${a.id}"`:""}>
            <span>${esc(a.accion)}</span>
            <span style="color:${tag};font-weight:700;font-size:11px;flex:none;margin-left:8px">${a.resultado === "resolvio" ? "resolvió" : a.resultado === "no_resolvio" ? "no resolvió" : "pendiente"}</span>
          </div>`;
        }).join("");
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
            <div><b style="font-size:14px">${esc(f.falla)}</b><div style="font-size:11px;color:var(--muted)">${f.tecnico} · ${fmtFecha(f.inicio_at || f.created_at)}</div></div>
            <span class="estado-tag estado-resuelta" style="font-size:10px">Resuelta</span>
          </div>
          ${accsHtml || '<div style="font-size:12px;color:var(--muted)">Sin acciones registradas</div>'}
          <div style="font-size:11px;color:var(--muted);margin-top:6px">Resuelta el ${fmtFecha(f.updated_at)}</div>`;
        if (isObrist) {
          const btnEF = document.createElement("button");
          btnEF.className = "btn btn-sec btn-sm";
          btnEF.style.cssText = "margin-top:10px;font-size:12px";
          btnEF.textContent = "✏️ Editar falla";
          btnEF.onclick = () => editarFalla(f);
          card.appendChild(btnEF);
          card.querySelectorAll("[data-hist-accid]").forEach(el => {
            const acc = acciones.find(a => String(a.id) === el.dataset.histAccid);
            if (!acc) return;
            const eb = document.createElement("button");
            eb.className = "btn btn-sec btn-sm";
            eb.style.cssText = "margin-left:6px;font-size:10px;padding:1px 6px;flex:none";
            eb.textContent = "✏️";
            eb.onclick = e => { e.stopPropagation(); editarAccion(acc, mdaNum); };
            el.appendChild(eb);
          });
        }
        contenido.appendChild(card);
      }
      if (!resueltas.length) contenido.innerHTML = '<p style="color:var(--muted);font-size:13px">Sin historial previo.</p>';
    }

    toggle.onclick = async () => {
      const abierto = contenido.style.display !== "none";
      contenido.style.display = abierto ? "none" : "block";
      toggle.querySelector(".arr").style.transform = abierto ? "" : "rotate(90deg)";
      if (!abierto) await cargarContenidoHistorial();
    };

    // Cargar automáticamente al abrir
    cargarContenidoHistorial();

    secHist.appendChild(toggle);
    secHist.appendChild(contenido);
    body.appendChild(secHist);
  }
}

function renderFalla(f, acciones) {
  const div = document.createElement("div");
  div.className = "falla-detalle";
  const cerrada = f.estado === "resuelta";
  const estLabel = { pendiente: "Pendiente", observacion: "En observación", resuelta: "Resuelta" }[f.estado] || f.estado;

  const accionesNoAnuladas = acciones.filter(a => !a.anulada);
  const pendientesDeProbar = accionesNoAnuladas.filter(a => a.resultado === "pendiente");
  const accionesNormales = accionesNoAnuladas.slice().reverse().filter(a => a.resultado !== "pendiente");
  const recientes = accionesNormales.slice(0, 3);
  const antiguas = accionesNormales.slice(3);

  function renderAccItem(a) {
    const resText = a.accion === "⟲ Volvió a fallar" ? "reincidencia"
      : a.resultado === "resolvio" ? "resolvió"
      : a.resultado === "no_resolvio" ? "no resolvió"
      : "sugerencia pendiente";
    const hist = a.historial_resultados
      ? `<div class="accion-hist">${esc(a.historial_resultados).split(" → ").map((h, i) => `<div>${i + 1}. ${h}</div>`).join("")}<div>${esc(a.historial_resultados).split(" → ").length + 1}. ${resText} (${a.tecnico} · ${fmtFecha(a.created_at)})</div></div>` : "";
    const clickable = (!a.anulada && a.resultado === "pendiente") ? `style="cursor:pointer" data-resolve="${a.id}" data-accion="${esc(a.accion)}"` : "";
    return `<div class="accion-item${a.anulada ? ' anulada' : ''}" data-accid="${a.id}" ${clickable}><div class="a-head"><span>${esc(a.accion)}</span><span class="res-tag res-${a.resultado}">${resText}</span></div><div class="accion-meta">${a.tecnico} · ${fmtFecha(a.created_at)}${a.resultado === "pendiente" ? ' <span style="color:var(--warn);font-size:11px">· toca para registrar resultado</span>' : ''}</div>${hist}</div>`;
  }

  let pendientesHtml = "";
  if (pendientesDeProbar.length) {
    pendientesHtml = `<div style="background:rgba(255,193,7,.12);border:1px solid var(--warn);border-radius:8px;padding:10px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--warn);margin-bottom:6px">⏳ Pendiente de probar (${pendientesDeProbar.length})</div>
      ${pendientesDeProbar.map(renderAccItem).join("")}
    </div>`;
  }

  let accHtml = recientes.map(renderAccItem).join("");
  if (antiguas.length) {
    accHtml += `<div class="ver-mas-acc" data-vermas="${f.id}" style="text-align:center;padding:8px;color:var(--accent);font-size:13px;cursor:pointer;border-top:1px solid var(--border)">Ver ${antiguas.length} anteriores ▾</div>`;
    accHtml += `<div class="acc-antiguas hidden" data-antiguas="${f.id}">${antiguas.map(renderAccItem).join("")}</div>`;
  }

  const anuladas = acciones.filter(a => a.anulada);
  const anuladasHtml = isObrist && anuladas.length
    ? `<details style="margin-top:8px"><summary style="font-size:11px;color:var(--muted);cursor:pointer">Acciones anuladas (${anuladas.length})</summary>${anuladas.map(renderAccItem).join("")}</details>`
    : "";

  div.innerHTML = `
    <h3 style="font-size:20px;margin-bottom:6px">${esc(f.falla)}</h3>
    <div class="meta">${f.tecnico} · ${fmtFecha(f.inicio_at || f.created_at)} · <span class="estado-tag estado-${f.estado}">${estLabel}</span>${!cerrada ? ` · <span style="font-size:11px;color:${f.estado === 'observacion' ? 'var(--accent)' : 'var(--warn)'}">${f.estado === 'observacion' ? 'en obs.' : 'pendiente'} hace ${tiempoDesde(f.updated_at)}</span>` : ""}</div>
    <div class="sugerencias-box" data-sug="${f.id}"></div>
    ${pendientesHtml}
    <div class="acciones-list">${accHtml || (pendientesDeProbar.length ? '' : '<p style="color:var(--muted);font-size:13px">Sin acciones aún.</p>')}${anuladasHtml}</div>
    <div style="margin-top:10px">
      <div class="fotos-grid" data-fotos="${f.id}"></div>
      ${!cerrada ? `<label class="btn btn-sec btn-sm" style="margin-top:8px;cursor:pointer;display:inline-block">📷 Agregar foto<input type="file" accept="image/*" data-fotoinput="${f.id}" style="display:none"></label>` : ""}
    </div>
    ${cerrada ? "" : `
    <div class="add-accion">
      <div class="add-accion-toggle" data-toggle-acc="${f.id}" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
        <label style="margin:0;cursor:pointer;pointer-events:none">+ Registrar acción o sugerencia</label>
        <span class="arr" style="color:var(--muted);transition:.2s;font-size:18px">›</span>
      </div>
      <div class="add-accion-body hidden" data-accbody="${f.id}">
        <div style="margin:10px 0 14px">
          <label style="margin:0 0 6px;font-size:12px">¿Qué estás registrando?</label>
          <div class="seg res" data-resseg="${f.id}">
            <button class="on" data-v="resolvio">Resolvió ✓</button>
            <button data-v="no_resolvio">No resolvió ✗</button>
            <button data-v="pendiente">Probar esto →</button>
          </div>
        </div>
        <div id="selacc-${f.id}" class="sel-accion hidden"></div>
        <div class="reg-arriba hidden" data-regarriba="${f.id}">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px">
            <button class="btn btn-ok" data-addacc="${f.id}" style="margin:0">Guardar</button>
            <button class="btn btn-sec btn-sm" data-tiempobtn="${f.id}" style="margin:0;font-size:12px">⏱ Ahora</button>
          </div>
        </div>
        <input class="acc-search" placeholder="Buscar acción…" data-search="${f.id}" style="margin-bottom:10px">
        <div class="chips" data-chips="${f.id}"></div>
        <div data-cats="${f.id}"></div>
      </div>
    </div>`}
  `;

  div.querySelectorAll(".seg.res").forEach(seg => {
    seg.querySelectorAll("button").forEach(b => b.onclick = () => {
      seg.querySelectorAll("button").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
    });
  });

  // Toggle de "Registrar lo que hice"
  const toggleAcc = div.querySelector("[data-toggle-acc='" + f.id + "']");
  const bodyAcc = div.querySelector("[data-accbody='" + f.id + "']");
  if (toggleAcc && bodyAcc) {
    toggleAcc.onclick = () => {
      const abierto = !bodyAcc.classList.contains("hidden");
      bodyAcc.classList.toggle("hidden");
      toggleAcc.querySelector(".arr").style.transform = abierto ? "" : "rotate(90deg)";
    };
  }
  // Ver más acciones antiguas
  const verMas = div.querySelector("[data-vermas='" + f.id + "']");
  const divAntiguas = div.querySelector("[data-antiguas='" + f.id + "']");
  if (verMas && divAntiguas) {
    verMas.onclick = () => {
      const abierto = !divAntiguas.classList.contains("hidden");
      divAntiguas.classList.toggle("hidden");
      verMas.textContent = abierto ? `Ver ${antiguas.length} anteriores ▾` : "Ocultar anteriores ▴";
    };
  }
  if (!cerrada) initSelectorAcciones(div, f.id, acciones);
  div.querySelector("[data-addacc='" + f.id + "']")?.addEventListener("click", () => addAccion(f.id));
  div.querySelector("[data-tiempobtn='" + f.id + "']")?.addEventListener("click", e => { e.stopPropagation(); abrirSelectorTiempo(f.id, e.currentTarget); });
  div.querySelectorAll("[data-resolve]").forEach(el => el.addEventListener("click", () => {
    resolverAccionPendiente(el.dataset.resolve, el.dataset.accion, f.id);
  }));
  // Fotos
  const fotoInput = div.querySelector("[data-fotoinput='" + f.id + "']");
  if (fotoInput) fotoInput.onchange = e => { const file = e.target.files[0]; if (file) subirFoto(f.id, file); };

  // Botón exportar — visible para todos
  const exportBar = document.createElement("div");
  exportBar.style.cssText = "margin:6px 0 8px";
  const btnExp = document.createElement("button");
  btnExp.className = "btn btn-sec btn-sm";
  btnExp.style.cssText = "font-size:12px";
  btnExp.textContent = "↓ Exportar informe";
  btnExp.onclick = () => exportarInformeFalla(f, acciones);
  exportBar.appendChild(btnExp);
  const metaElExp = div.querySelector(".meta");
  if (metaElExp) metaElExp.insertAdjacentElement("afterend", exportBar);

  // Obrist: controles de edición
  if (isObrist) {
    const bar = document.createElement("div");
    bar.style.cssText = "margin:4px 0 10px;display:flex;gap:6px;flex-wrap:wrap";
    const btnEF = document.createElement("button");
    btnEF.className = "btn btn-sec btn-sm";
    btnEF.style.fontSize = "12px";
    btnEF.textContent = "✏️ Editar falla";
    btnEF.onclick = () => editarFalla(f);
    bar.appendChild(btnEF);
    const metaEl = div.querySelector(".meta");
    if (metaEl) metaEl.insertAdjacentElement("afterend", bar);
    // Botón de editar en cada acción
    div.querySelectorAll("[data-accid]").forEach(el => {
      const acc = acciones.find(a => String(a.id) === el.dataset.accid);
      if (!acc) return;
      const eb = document.createElement("button");
      eb.className = "btn btn-sec btn-sm";
      eb.style.cssText = "margin:5px 0 0;font-size:11px;padding:2px 8px";
      eb.textContent = "✏️ editar";
      eb.onclick = e => { e.stopPropagation(); editarAccion(acc, f.mda); };
      el.appendChild(eb);
      const db = document.createElement("button");
      db.className = "btn btn-sm";
      db.style.cssText = "margin:5px 0 0 4px;font-size:11px;padding:2px 8px;background:none;border:1px solid var(--danger);color:var(--danger)";
      db.textContent = "🗑️ borrar";
      db.onclick = async e => {
        e.stopPropagation();
        if (!await confirmar(`¿Borrar permanentemente "${acc.accion}"? No se puede deshacer.`, { ok: "Borrar", danger: true })) return;
        await sb.from("acciones").delete().eq("id", acc.id);
        audit("borrar_accion", { id: acc.id, accion: acc.accion });
        toast("Acción borrada");
        abrirMda(f.mda);
      };
      el.appendChild(db);
    });
  }

  // Botón de confirmar repuesto dudoso — solo visible al técnico dueño o Obrist
  div.querySelectorAll("[data-accid]").forEach(el => {
    const acc = acciones.find(a => String(a.id) === el.dataset.accid);
    if (!acc || !acc.accion.includes("(usada - dudosa)")) return;
    if (acc.tecnico !== tecnico && !isObrist) return;
    const rb = document.createElement("button");
    rb.className = "btn btn-sm";
    rb.style.cssText = "margin:6px 0 0;font-size:11px;padding:3px 10px;border:1px solid var(--warn);color:var(--warn);background:none;border-radius:6px";
    rb.textContent = "❓ ¿Cómo era el repuesto?";
    rb.onclick = async e => {
      e.stopPropagation();
      const ov = document.createElement("div");
      ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px";
      ov.innerHTML = `<div style="background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:320px">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px">¿Cómo era el repuesto?</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:16px">${esc(acc.accion.replace(" (usada - dudosa)", ""))}</div>
        <button class="btn btn-ok" id="rbBueno" style="margin-top:0">✓ Era bueno</button>
        <button class="btn btn-danger" id="rbMalo" style="margin-top:10px">✗ Era defectuoso</button>
        <button class="btn btn-sec" id="rbCancel" style="margin-top:10px">Cancelar</button>
      </div>`;
      document.body.appendChild(ov);
      ov.onclick = ev => { if (ev.target === ov) ov.remove(); };
      ov.querySelector("#rbCancel").onclick = () => ov.remove();
      async function confirmarRepuesto(bueno) {
        ov.remove();
        const nuevoNombre = acc.accion.replace("(usada - dudosa)", bueno ? "(usada - probada)" : "(usada - defectuosa)");
        await sb.from("acciones").update({ accion: nuevoNombre }).eq("id", acc.id);
        audit("confirmar_repuesto", { id: acc.id, resultado: bueno ? "bueno" : "defectuoso" });
        toast(bueno ? "Repuesto marcado como bueno" : "Repuesto marcado como defectuoso");
        abrirMda(f.mda);
      }
      ov.querySelector("#rbBueno").onclick = () => confirmarRepuesto(true);
      ov.querySelector("#rbMalo").onclick = () => confirmarRepuesto(false);
    };
    el.appendChild(rb);
  });

  return div;
}

function initSelectorAcciones(div, fid, accionesExistentes) {
  const chips = div.querySelector("[data-chips='" + fid + "']");
  const cats = div.querySelector("[data-cats='" + fid + "']");
  const search = div.querySelector("[data-search='" + fid + "']");
  const selBox = div.querySelector("#selacc-" + fid);
  const regArriba = div.querySelector("[data-regarriba='" + fid + "']");
  accSel[fid] = [];

  function render() {
    const sel = accSel[fid] || [];
    if (!sel.length) { selBox.classList.add("hidden"); regArriba.classList.add("hidden"); return; }
    selBox.innerHTML = sel.map(a => `<span class="acc-tag">${esc(a)}<span class="x" data-rm="${esc(a)}">×</span></span>`).join("");
    selBox.classList.remove("hidden");
    regArriba.classList.remove("hidden");
    selBox.querySelectorAll("[data-rm]").forEach(x => x.onclick = () => { accSel[fid] = accSel[fid].filter(a => a !== x.dataset.rm); render(); });
  }

  function agregarAcc(acc) {
    accSel[fid] = accSel[fid] || [];
    if (!accSel[fid].includes(acc)) accSel[fid].push(acc);
    render();
    selBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function elegir(acc) {
    const resSel = div.querySelector("[data-resseg='" + fid + "'] button.on")?.dataset.v;
    if (resSel !== "pendiente") {
      if (ACCIONES_PIEZA.has(acc)) {
        mostrarOverlayCambio(acc, agregarAcc);
        return;
      }
      if (/firmware|variant/i.test(acc)) {
        mostrarOverlayFirmware(acc, agregarAcc);
        return;
      }
    }
    agregarAcc(acc);
  }

  const favs = TOP_ACCIONES.length ? TOP_ACCIONES : FAVS;

  function pintarChips(filtro) {
    chips.innerHTML = "";
    const q = (filtro || "").toLowerCase().trim();
    favs.forEach(a => {
      if (!TODAS.includes(a)) return;
      if (q && !a.toLowerCase().includes(q)) return;
      const c = document.createElement("button");
      c.className = "chip fav";
      c.textContent = a;
      c.onclick = () => elegir(a);
      chips.appendChild(c);
    });
  }
  pintarChips("");

  function pintarCats(filtro) {
    cats.innerHTML = "";
    const q = (filtro || "").toLowerCase().trim();
    if (q) {
      const res = TODAS.filter(a => a.toLowerCase().includes(q));
      if (!res.length) {
        cats.innerHTML = '<div class="no-res">Sin coincidencias en el catálogo</div>';
        const btnUsar = document.createElement("button");
        btnUsar.className = "add-nueva-acc";
        btnUsar.textContent = `Usar "${filtro}" directo →`;
        btnUsar.onclick = () => { elegir(filtro); search.value = ""; pintarCats(""); };
        cats.appendChild(btnUsar);
        if (isObrist) {
          const btnCat = document.createElement("button");
          btnCat.className = "add-nueva-acc";
          btnCat.style.marginTop = "6px";
          btnCat.textContent = `+ Agregar al catálogo`;
          btnCat.onclick = () => agregarAlCatalogo(filtro, fid, elegir);
          cats.appendChild(btnCat);
        }
        return;
      }
      const box = document.createElement("div");
      box.className = "cat-items open";
      res.forEach(a => { const it = document.createElement("div"); it.className = "cat-item"; it.textContent = a; it.onclick = () => elegir(a); box.appendChild(it); });
      cats.appendChild(box);
      return;
    }
    Object.entries(ACCIONES).forEach(([cat, items]) => {
      const block = document.createElement("div");
      block.className = "cat-block";
      const head = document.createElement("div");
      head.className = "cat-head";
      head.innerHTML = `<span>${cat}</span><span class="arr">›</span>`;
      const body = document.createElement("div");
      body.className = "cat-items";
      items.forEach(a => { const it = document.createElement("div"); it.className = "cat-item"; it.textContent = a; it.onclick = () => elegir(a); body.appendChild(it); });
      head.onclick = () => { head.classList.toggle("open"); body.classList.toggle("open"); };
      block.appendChild(head);
      block.appendChild(body);
      cats.appendChild(block);
    });
  }

  pintarCats("");
  search.oninput = () => { pintarChips(search.value); pintarCats(search.value); };
  elegirCallbacks[fid] = elegir;
}

async function agregarAlCatalogo(nombre, fid, elegirFn) {
  const cats = Object.keys(ACCIONES);
  const cat = await preguntar("¿A qué categoría? (" + cats.join(", ") + ")");
  if (!cat || !cats.includes(cat)) { toast("Categoría inválida"); return; }
  const { error } = await sb.from("catalogo_acciones").insert({ categoria: cat, accion: nombre, activa: true });
  if (error) { toast("Error al agregar"); return; }
  audit("agregar_accion_catalogo", { accion: nombre, categoria: cat });
  await cargarMaestros();
  elegirFn(nombre);
  toast("Agregado al catálogo");
}

async function addAccion(fallaId) {
  const sel = accSel[fallaId] || [];
  if (!sel.length) { toast("Elige al menos una acción"); return; }
  const res = document.querySelector("[data-resseg='" + fallaId + "'] button.on").dataset.v;
  const ts = accTime[fallaId] || new Date().toISOString();
  let existentes = [];
  if (navigator.onLine) {
    const { data } = await sb.from("acciones").select("*").eq("falla_id", fallaId);
    existentes = (data || []).filter(a => !a.anulada);
  }
  const resLabel = { resolvio: "resolvió", no_resolvio: "no resolvió", pendiente: "sugerencia" };
  for (const txt of sel) {
    if (res === "pendiente") {
      // Sugerencia: solo insertar si no existe ya una sugerencia pendiente idéntica
      const yaExiste = existentes.find(a => a.accion === txt && a.resultado === "pendiente");
      if (yaExiste) continue;
      const d = { falla_id: fallaId, accion: txt, resultado: "pendiente", tecnico: tecnico, created_at: ts };
      if (navigator.onLine) { await sb.from("acciones").insert(d); }
      else { cola.push({ id: uid(), t: "accion", d }); guardarCola(); }
    } else {
      // resolvio / no_resolvio: encadenar si existe registro previo para la misma acción
      const prev = existentes.find(a => a.accion === txt);
      if (prev && navigator.onLine) {
        const rastro = (prev.historial_resultados ? prev.historial_resultados + " → " : "") + `${resLabel[prev.resultado]} (${prev.tecnico} · ${fmtFecha(prev.created_at)})`;
        const { error } = await sb.from("acciones").update({ resultado: res, tecnico: tecnico, created_at: ts, historial_resultados: rastro }).eq("id", prev.id);
        if (error) { cola.push({ id: uid(), t: "accion", d: { falla_id: fallaId, accion: txt, resultado: res, tecnico: tecnico, created_at: ts } }); guardarCola(); }
      } else {
        const d = { falla_id: fallaId, accion: txt, resultado: res, tecnico: tecnico, created_at: ts };
        if (navigator.onLine) { const { error } = await sb.from("acciones").insert(d); if (error) { cola.push({ id: uid(), t: "accion", d }); guardarCola(); } }
        else { cola.push({ id: uid(), t: "accion", d }); guardarCola(); }
      }
    }
  }

  let nuevoEstado = null;
  if (res === "resolvio") nuevoEstado = "observacion";
  else if (res === "no_resolvio") nuevoEstado = "pendiente";
  const upd = { updated_at: new Date().toISOString() };
  if (nuevoEstado) upd.estado = nuevoEstado;
  if (navigator.onLine) { await sb.from("mdas_fallas").update(upd).eq("id", fallaId); }
  else if (nuevoEstado) { cola.push({ id: uid(), t: "estado", d: { id: fallaId, estado: nuevoEstado } }); guardarCola(); }

  // Sumar al contador permanente de uso
  if (navigator.onLine) {
    for (const txt of sel) {
      const base = txt.replace(/\s*\(nueva\)|\s*\(usada.*?\)|\s*\([^)]*\)$/gi, "").trim();
      await sb.rpc("incrementar_uso", { nombre: base });
    }
  }

  audit("registrar_acciones", { falla_id: fallaId, acciones: sel, resultado: res, nuevo_estado: nuevoEstado });
  accSel[fallaId] = [];
  accTime[fallaId] = null;
  delete elegirCallbacks[fallaId];
  toast(nuevoEstado === "observacion" ? "Registrado · en observación" : "Registrado");
  await cargarMaestros();
  await cargarLista();
  abrirMda(mdaActual);
}

function resolverAccionPendiente(accionId, nombre, fallaId) {
  const OPCIONES = [
    { label: "15 min",  ms: 15 * 60000 },
    { label: "30 min",  ms: 30 * 60000 },
    { label: "1 hora",  ms: 3600000 },
    { label: "2 horas", ms: 2 * 3600000 },
    { label: "3 horas", ms: 3 * 3600000 },
    { label: "6 horas", ms: 6 * 3600000 },
    { label: "12 horas",ms: 12 * 3600000 },
    { label: "1 día",   ms: 24 * 3600000 },
  ];
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:380px">
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(nombre)}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px">¿Cómo quedó esta acción?</div>
      <button class="btn btn-ok" id="oRes" style="margin-top:0">✓ Resolvió</button>
      <button class="btn btn-danger" id="oNoRes" style="margin-top:10px">✗ No resolvió</button>
      <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">⏱ ¿Cuándo lo hiciste?</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px" id="rOpts"></div>
        <input type="datetime-local" id="rCustom" value="${nowStr}" style="margin-bottom:8px">
        <button class="btn btn-sec btn-sm" id="rCustomOk" style="margin:0">Usar esta fecha</button>
        <div id="rTsLabel" style="font-size:12px;color:var(--warn);margin-top:8px;min-height:16px"></div>
      </div>
      <button class="btn btn-sec" id="oCancelar" style="margin-top:12px">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);

  let tsElegido = null;

  const optsEl = overlay.querySelector("#rOpts");
  OPCIONES.forEach(o => {
    const b = document.createElement("button");
    b.className = "btn btn-sec btn-sm"; b.style.margin = "0";
    b.textContent = `Hace ${o.label}`;
    b.onclick = () => {
      tsElegido = new Date(Date.now() - o.ms).toISOString();
      overlay.querySelector("#rTsLabel").textContent = `Registrará hace ${o.label}`;
    };
    optsEl.appendChild(b);
  });

  overlay.querySelector("#rCustomOk").onclick = () => {
    const val = overlay.querySelector("#rCustom").value;
    if (!val) return;
    const fecha = new Date(val);
    if (isNaN(fecha) || fecha > new Date()) { toast("Fecha inválida o en el futuro"); return; }
    tsElegido = fecha.toISOString();
    overlay.querySelector("#rTsLabel").textContent = `Registrará: ${fmtFecha(tsElegido)}`;
  };

  overlay.querySelector("#oCancelar").onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  async function aplicar(res) {
    overlay.remove();
    const ts = tsElegido || new Date().toISOString();
    const { data: orig } = await sb.from("acciones").select("*").eq("id", accionId).single();
    const resLabelOrig = { resolvio: "resolvió", no_resolvio: "no resolvió", pendiente: "sugerencia" };
    const rastro = (orig?.historial_resultados ? orig.historial_resultados + " → " : "") + `${resLabelOrig[orig?.resultado] || "sugerencia"} (${orig?.tecnico} · ${fmtFecha(orig?.created_at)})`;
    await sb.from("acciones").update({ resultado: res, tecnico, created_at: ts, historial_resultados: rastro }).eq("id", accionId);
    let nuevoEstado = res === "resolvio" ? "observacion" : res === "no_resolvio" ? "pendiente" : null;
    if (nuevoEstado) await sb.from("mdas_fallas").update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq("id", fallaId);
    audit("resolver_accion_pendiente", { accion_id: accionId, resultado: res, falla_id: fallaId });
    toast(nuevoEstado === "observacion" ? "Resuelto · en observación" : "Registrado");
    await cargarLista();
    abrirMda(mdaActual);
  }

  overlay.querySelector("#oRes").onclick = () => aplicar("resolvio");
  overlay.querySelector("#oNoRes").onclick = () => aplicar("no_resolvio");
}
