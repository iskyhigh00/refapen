const accSel = {};

async function abrirMda(mdaNum) {
  $("scrMda").classList.remove("hidden");
  $("mdaTitulo").textContent = "MDA " + mdaNum;
  $("mdaBody").innerHTML = "<p style='color:var(--muted)'>Cargando…</p>";
  audit("abrir_mda", { mda: mdaNum });

  let fallas = [];
  if (navigator.onLine) {
    const { data } = await sb.from("mdas_fallas").select("*").eq("mda", mdaNum).order("created_at", { ascending: false });
    fallas = data || [];
  } else {
    fallas = JSON.parse(localStorage.getItem("cache_fallas") || "[]").filter(f => f.mda === mdaNum);
  }

  const body = $("mdaBody");
  body.innerHTML = "";
  for (const f of fallas) {
    let acciones = [];
    if (navigator.onLine) {
      const { data } = await sb.from("acciones").select("*").eq("falla_id", f.id).order("created_at", { ascending: true });
      acciones = data || [];
    }
    body.appendChild(renderFalla(f, acciones));
  }
}

function renderFalla(f, acciones) {
  const div = document.createElement("div");
  div.className = "falla-detalle";
  const cerrada = f.estado === "resuelta";
  const estLabel = { pendiente: "Pendiente", observacion: "En observación", resuelta: "Resuelta" }[f.estado] || f.estado;

  let accHtml = "";
  acciones.forEach(a => {
    const hist = a.historial_resultados
      ? `<div class="accion-hist">${esc(a.historial_resultados).split(" → ").map((h, i) => `<div>${i + 1}. ${h}</div>`).join("")}<div>${esc(a.historial_resultados).split(" → ").length + 1}. ${a.resultado === "resolvio" ? "resolvió" : a.resultado === "no_resolvio" ? "no resolvió" : "pendiente"} (${a.tecnico} · ${fmtFecha(a.created_at)})</div></div>` : "";
    const clickable = (!a.anulada && a.resultado === "pendiente") ? `style="cursor:pointer" data-resolve="${a.id}" data-accion="${esc(a.accion)}"` : "";
    accHtml += `<div class="accion-item${a.anulada ? ' anulada' : ''}" ${clickable}><div class="a-head"><span>${esc(a.accion)}</span><span class="res-tag res-${a.resultado}">${a.resultado === "resolvio" ? "resolvió" : a.resultado === "no_resolvio" ? "no resolvió" : "pendiente"}</span></div><div class="accion-meta">${a.tecnico} · ${fmtFecha(a.created_at)}</div>${hist}</div>`;
  });

  div.innerHTML = `
    <h3>${esc(f.falla)}</h3>
    <div class="meta">${f.tecnico} · ${fmtFecha(f.created_at)} · <span class="estado-tag estado-${f.estado}">${estLabel}</span></div>
    <div class="acciones-list">${accHtml || '<p style="color:var(--muted);font-size:13px">Sin acciones aún.</p>'}</div>
    ${cerrada ? "" : `
    <div class="add-accion">
      <label style="margin-top:0">Registrar lo que hice</label>
      <div id="selacc-${f.id}" class="sel-accion hidden"></div>
      <div class="reg-arriba hidden" data-regarriba="${f.id}">
        <div class="seg res" data-resseg="${f.id}">
          <button class="on" data-v="resolvio">Resolvió</button>
          <button data-v="no_resolvio">No resolvió</button>
          <button data-v="pendiente">Pendiente</button>
        </div>
        <button class="btn btn-ok" data-addacc="${f.id}" style="margin-top:10px">Guardar acciones</button>
      </div>
      <input class="acc-search" placeholder="Buscar acción…" data-search="${f.id}" style="margin-bottom:10px">
      <div class="chips" data-chips="${f.id}"></div>
      <div data-cats="${f.id}"></div>
    </div>`}
  `;

  div.querySelectorAll(".seg.res").forEach(seg => {
    seg.querySelectorAll("button").forEach(b => b.onclick = () => {
      seg.querySelectorAll("button").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
    });
  });

  if (!cerrada) initSelectorAcciones(div, f.id, acciones);
  div.querySelector("[data-addacc='" + f.id + "']")?.addEventListener("click", () => addAccion(f.id));
  div.querySelectorAll("[data-resolve]").forEach(el => el.addEventListener("click", () => {
    resolverAccionPendiente(el.dataset.resolve, el.dataset.accion, f.id);
  }));
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

  function elegir(acc) {
    accSel[fid] = accSel[fid] || [];
    if (!accSel[fid].includes(acc)) accSel[fid].push(acc);
    render();
    selBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  chips.innerHTML = "";
  FAVS.forEach(a => {
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
        cats.innerHTML = '<div class="no-res">Sin coincidencias</div>';
        const btn = document.createElement("button");
        btn.className = "add-nueva-acc";
        btn.textContent = `+ Agregar "${filtro}" al catálogo`;
        btn.onclick = () => agregarAlCatalogo(filtro, fid, elegir);
        cats.appendChild(btn);
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
}

async function agregarAlCatalogo(nombre, fid, elegirFn) {
  const cat = prompt("¿A qué categoría pertenece?\n" + Object.keys(ACCIONES).join("\n"));
  if (!cat || !Object.keys(ACCIONES).hasOwnProperty(cat)) { toast("Categoría inválida"); return; }
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
  const resLabel = { resolvio: "resolvió", no_resolvio: "no resolvió", pendiente: "pendiente" };
  for (const txt of sel) {
    const prev = existentes.find(a => a.accion === txt);
    if (prev && navigator.onLine) {
      const rastro = (prev.historial_resultados ? prev.historial_resultados + " → " : "") + `${resLabel[prev.resultado]} (${prev.tecnico} · ${fmtFecha(prev.created_at)})`;
      const { error } = await sb.from("acciones").update({ resultado: res, tecnico: tecnico, created_at: ts, historial_resultados: rastro }).eq("id", prev.id);
      if (error) { cola.push({ t: "accion", d: { falla_id: fallaId, accion: txt, resultado: res, tecnico: tecnico, created_at: ts } }); guardarCola(); }
    } else {
      const d = { falla_id: fallaId, accion: txt, resultado: res, tecnico: tecnico, created_at: ts };
      if (navigator.onLine) { const { error } = await sb.from("acciones").insert(d); if (error) { cola.push({ t: "accion", d }); guardarCola(); } }
      else { cola.push({ t: "accion", d }); guardarCola(); }
    }
  }

  let nuevoEstado = null;
  if (res === "resolvio") nuevoEstado = "observacion";
  else if (res === "no_resolvio") nuevoEstado = "pendiente";
  const upd = { updated_at: ts };
  if (nuevoEstado) upd.estado = nuevoEstado;
  if (navigator.onLine) { await sb.from("mdas_fallas").update(upd).eq("id", fallaId); }
  else if (nuevoEstado) { cola.push({ t: "estado", d: { id: fallaId, estado: nuevoEstado } }); guardarCola(); }

  audit("registrar_acciones", { falla_id: fallaId, acciones: sel, resultado: res, nuevo_estado: nuevoEstado });
  accSel[fallaId] = [];
  toast(nuevoEstado === "observacion" ? "Registrado · en observación" : "Registrado");
  const mda = $("mdaTitulo").textContent.replace("MDA ", "");
  abrirMda(mda);
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
    const rastro = `pendiente (${tecnico} · ${fmtFecha(ts)})`;
    await sb.from("acciones").update({ resultado: res, tecnico, created_at: ts, historial_resultados: rastro }).eq("id", accionId);
    let nuevoEstado = res === "resolvio" ? "observacion" : res === "no_resolvio" ? "pendiente" : null;
    if (nuevoEstado) await sb.from("mdas_fallas").update({ estado: nuevoEstado, updated_at: ts }).eq("id", fallaId);
    audit("resolver_accion_pendiente", { accion_id: accionId, resultado: res, falla_id: fallaId });
    toast(nuevoEstado === "observacion" ? "Resuelto · en observación" : "Registrado");
    const mda = $("mdaTitulo").textContent.replace("MDA ", "");
    abrirMda(mda);
    cargarLista();
  }

  overlay.querySelector("#oRes").onclick = () => aplicar("resolvio");
  overlay.querySelector("#oNoRes").onclick = () => aplicar("no_resolvio");
}
