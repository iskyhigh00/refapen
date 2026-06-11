const accSel = {};
const elegirCallbacks = {};

async function editarFalla(f) {
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px";
  const box = document.createElement("div");
  box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:400px;max-height:92vh;overflow-y:auto";
  const tecOpts = TECNICOS.map(t => `<option value="${esc(t)}"${t===f.tecnico?" selected":""}>${esc(t)}</option>`).join("");
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
    if (!falla) { toast("La descripción no puede estar vacía"); return; }
    const { error } = await sb.from("mdas_fallas").update({ falla, estado, tecnico: tecnicoVal, mda: mdaVal, isla: islaVal, updated_at: new Date().toISOString() }).eq("id", f.id);
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
    if (!accion) { toast("El texto no puede estar vacío"); return; }
    const { error } = await sb.from("acciones").update({ accion, resultado, tecnico: tecnicoVal }).eq("id", a.id);
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
            <div><b style="font-size:14px">${esc(f.falla)}</b><div style="font-size:11px;color:var(--muted)">${f.tecnico} · ${fmtFecha(f.created_at)}</div></div>
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
  const accionesNormales = [...acciones].reverse().filter(a => a.resultado !== "pendiente");
  const recientes = accionesNormales.slice(0, 3);
  const antiguas = accionesNormales.slice(3);

  function renderAccItem(a) {
    const resText = a.resultado === "resolvio" ? "resolvió" : a.resultado === "no_resolvio" ? "no resolvió" : "sugerencia pendiente";
    const hist = a.historial_resultados
      ? `<div class="accion-hist">${esc(a.historial_resultados).split(" → ").map((h, i) => `<div>${i + 1}. ${h}</div>`).join("")}<div>${esc(a.historial_resultados).split(" → ").length + 1}. ${resText} (${a.tecnico} · ${fmtFecha(a.created_at)})</div></div>` : "";
    const clickable = (!a.anulada && a.resultado === "pendiente") ? `style="cursor:pointer" data-resolve="${a.id}" data-accion="${esc(a.accion)}"` : "";
    return `<div class="accion-item${a.anulada ? ' anulada' : ''}" data-accid="${a.id}" ${clickable}><div class="a-head"><span>${esc(a.accion)}</span><span class="res-tag res-${a.resultado}">${resText}</span></div><div class="accion-meta">${a.tecnico} · hace ${tiempoDesde(a.created_at)} <span style="color:var(--border)">·</span> <span style="font-size:10px">${fmtFecha(a.created_at)}</span>${a.resultado === "pendiente" ? ' <span style="color:var(--warn);font-size:11px">· toca para registrar resultado</span>' : ''}</div>${hist}</div>`;
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

  div.innerHTML = `
    <h3 style="font-size:20px;margin-bottom:6px">${esc(f.falla)}</h3>
    <div class="meta">${f.tecnico} · ${fmtFecha(f.created_at)} · <span class="estado-tag estado-${f.estado}">${estLabel}</span>${!cerrada ? ` · <span style="font-size:11px;color:${f.estado === 'observacion' ? 'var(--accent)' : 'var(--warn)'}">${f.estado === 'observacion' ? 'en obs.' : 'pendiente'} hace ${tiempoDesde(f.updated_at)}</span>` : ""}</div>
    <div class="sugerencias-box" data-sug="${f.id}"></div>
    ${pendientesHtml}
    <div class="acciones-list">${accHtml || (pendientesDeProbar.length ? '' : '<p style="color:var(--muted);font-size:13px">Sin acciones aún.</p>')}</div>
    <div style="margin-top:10px">
      <div class="fotos-grid" data-fotos="${f.id}"></div>
      ${!cerrada ? `<label class="btn btn-sec btn-sm" style="margin-top:8px;cursor:pointer;display:inline-block">📷 Agregar foto<input type="file" accept="image/*" capture="environment" data-fotoinput="${f.id}" style="display:none"></label>` : ""}
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
          <button class="btn btn-ok" data-addacc="${f.id}" style="margin-top:10px">Guardar</button>
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
  div.querySelectorAll("[data-resolve]").forEach(el => el.addEventListener("click", () => {
    resolverAccionPendiente(el.dataset.resolve, el.dataset.accion, f.id);
  }));
  // Fotos
  const fotoInput = div.querySelector("[data-fotoinput='" + f.id + "']");
  if (fotoInput) fotoInput.onchange = e => { const file = e.target.files[0]; if (file) subirFoto(f.id, file); };

  // Obrist: controles de edición
  if (isObrist) {
    const bar = document.createElement("div");
    bar.style.cssText = "margin:8px 0 10px;display:flex;gap:6px;flex-wrap:wrap";
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
    });
  }

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
    // Si es sugerencia, agregar directo sin preguntas de detalle
    const resSel = div.querySelector("[data-resseg='" + fid + "'] button.on")?.dataset.v;
    if (resSel !== "pendiente") {
      if (/cambio|intercambio/i.test(acc)) {
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

  chips.innerHTML = "";
  const favs = TOP_ACCIONES.length ? TOP_ACCIONES : FAVS;
  favs.forEach(a => {
    if (!TODAS.includes(a)) return;
    const c = document.createElement("button");
    c.className = "chip fav";
    c.textContent = a;
    c.onclick = () => elegir(a);
    chips.appendChild(c);
  });

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
  search.oninput = () => pintarCats(search.value);
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
  const ts = new Date().toISOString();
  let existentes = [];
  if (navigator.onLine) {
    const { data } = await sb.from("acciones").select("*").eq("falla_id", fallaId);
    existentes = (data || []).filter(a => !a.anulada);
  }
  const resLabel = { resolvio: "resolvió", no_resolvio: "no resolvió", pendiente: "sugerencia" };
  for (const txt of sel) {
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

  let nuevoEstado = null;
  if (res === "resolvio") nuevoEstado = "observacion";
  else if (res === "no_resolvio") nuevoEstado = "pendiente";
  const upd = { updated_at: ts };
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
  delete elegirCallbacks[fallaId];
  toast(nuevoEstado === "observacion" ? "Registrado · en observación" : "Registrado");
  await cargarMaestros();
  await cargarLista();
  $("scrMda").classList.add("hidden");
}

function resolverAccionPendiente(accionId, nombre, fallaId) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:360px">
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(nombre)}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px">¿Cómo quedó esta acción?</div>
      <button class="btn btn-ok" id="oRes" style="margin-top:0">✓ Resolvió</button>
      <button class="btn btn-danger" id="oNoRes" style="margin-top:10px">✗ No resolvió</button>
      <button class="btn btn-sec" id="oCancelar" style="margin-top:10px">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#oCancelar").onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  async function aplicar(res) {
    overlay.remove();
    const ts = new Date().toISOString();
    // Obtener datos originales para preservar quién sugirió
    const { data: orig } = await sb.from("acciones").select("*").eq("id", accionId).single();
    const resLabelOrig = { resolvio: "resolvió", no_resolvio: "no resolvió", pendiente: "sugerencia" };
    const rastro = (orig?.historial_resultados ? orig.historial_resultados + " → " : "") + `${resLabelOrig[orig?.resultado] || "sugerencia"} (${orig?.tecnico} · ${fmtFecha(orig?.created_at)})`;
    await sb.from("acciones").update({ resultado: res, tecnico, created_at: ts, historial_resultados: rastro }).eq("id", accionId);
    let nuevoEstado = res === "resolvio" ? "observacion" : res === "no_resolvio" ? "pendiente" : null;
    if (nuevoEstado) await sb.from("mdas_fallas").update({ estado: nuevoEstado, updated_at: ts }).eq("id", fallaId);
    audit("resolver_accion_pendiente", { accion_id: accionId, resultado: res, falla_id: fallaId });
    toast(nuevoEstado === "observacion" ? "Resuelto · en observación" : "Registrado");
    await cargarLista();
    $("scrMda").classList.add("hidden");
  }

  overlay.querySelector("#oRes").onclick = () => aplicar("resolvio");
  overlay.querySelector("#oNoRes").onclick = () => aplicar("no_resolvio");
}
