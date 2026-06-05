let statsFiltro = "todo";

async function cargarStats() {
  const body = $("statsBody");
  body.innerHTML = '<p style="color:var(--muted)">Cargando estadísticas…</p>';

  const [{ data: todasRaw }, { data: accionesRaw }] = await Promise.all([
    sb.from("mdas_fallas").select("*"),
    sb.from("acciones").select("accion,resultado,tecnico,created_at,anulada").eq("anulada", false)
  ]);

  if (!todasRaw) { body.innerHTML = '<p style="color:var(--danger)">Error cargando datos</p>'; return; }

  function filtrarPorFecha(arr) {
    if (statsFiltro === "todo") return arr;
    const ahora = Date.now();
    const limites = { semana: 7, mes: 30, trimestre: 90 };
    const dias = limites[statsFiltro] || 9999;
    const desde = ahora - dias * 86400000;
    return arr.filter(r => new Date(r.created_at) >= desde);
  }

  const todas = filtrarPorFecha(todasRaw);
  const pend = todas.filter(f => f.estado === "pendiente");
  const obs = todas.filter(f => f.estado === "observacion");
  const res = todas.filter(f => f.estado === "resuelta");
  const accs = filtrarPorFecha(accionesRaw || []);

  // Tiempo promedio de resolución
  let tTotal = 0, tCount = 0;
  res.forEach(f => {
    const diff = new Date(f.updated_at) - new Date(f.created_at);
    if (diff > 0) { tTotal += diff; tCount++; }
  });
  const promedio = tCount ? formatMs(tTotal / tCount) : "—";

  // Urgentes (3+ días pendientes)
  const urgentes = pend.filter(f => diasDesde(f.updated_at) >= 3).length;

  // Top MDAs con más fallas
  const mdaC = {};
  todas.forEach(f => { mdaC[f.mda] = (mdaC[f.mda] || 0) + 1; });
  const topMda = Object.entries(mdaC).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxMda = topMda[0]?.[1] || 1;

  // Top técnicos por resoluciones
  const tecC = {};
  accs.filter(a => a.resultado === "resolvio").forEach(a => { tecC[a.tecnico] = (tecC[a.tecnico] || 0) + 1; });
  const topTec = Object.entries(tecC).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTec = topTec[0]?.[1] || 1;

  // Acciones más frecuentes
  const accC = {};
  accs.forEach(a => { accC[a.accion] = (accC[a.accion] || 0) + 1; });
  const topAcc = Object.entries(accC).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxAcc = topAcc[0]?.[1] || 1;

  // Piezas: nueva vs usada
  const piezas = { nueva: 0, "usada - probada": 0, "usada - dudosa": 0 };
  accs.forEach(a => {
    if (/\(nueva\)/.test(a.accion)) piezas.nueva++;
    else if (/\(usada - probada\)/.test(a.accion)) piezas["usada - probada"]++;
    else if (/\(usada - dudosa\)/.test(a.accion)) piezas["usada - dudosa"]++;
  });
  const totalPiezas = piezas.nueva + piezas["usada - probada"] + piezas["usada - dudosa"];

  body.innerHTML = `
    <div class="seg" style="margin-bottom:16px" id="statsFiltroSeg">
      <button data-sf="todo" class="${statsFiltro === 'todo' ? 'on' : ''}">Todo</button>
      <button data-sf="semana" class="${statsFiltro === 'semana' ? 'on' : ''}">7 días</button>
      <button data-sf="mes" class="${statsFiltro === 'mes' ? 'on' : ''}">30 días</button>
      <button data-sf="trimestre" class="${statsFiltro === 'trimestre' ? 'on' : ''}">90 días</button>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-num">${todas.length}</div><div class="stat-label">Total</div></div>
      <div class="stat-card warn"><div class="stat-num">${pend.length}</div><div class="stat-label">Pendientes</div></div>
      <div class="stat-card accent"><div class="stat-num">${obs.length}</div><div class="stat-label">Observación</div></div>
      <div class="stat-card ok"><div class="stat-num">${res.length}</div><div class="stat-label">Resueltas</div></div>
    </div>

    <div class="stats-row">
      <div class="stat-card mini"><div class="stat-label">Tiempo promedio resolución</div><div class="stat-num mid">${promedio}</div></div>
      <div class="stat-card mini ${urgentes ? 'danger' : ''}"><div class="stat-label">Urgentes (3+ días)</div><div class="stat-num mid">${urgentes}</div></div>
    </div>

    <div class="stat-section">
      <h3>MDAs con más fallas</h3>
      ${topMda.map(([mda, n]) => `<div class="stat-bar-row"><span class="stat-bar-label">MDA ${mda}</span><div class="stat-bar-track"><div class="stat-bar warn" style="width:${(n / maxMda) * 100}%"></div></div><span class="stat-bar-val">${n}</span></div>`).join("") || '<p class="stat-empty">Sin datos</p>'}
    </div>

    <div class="stat-section">
      <h3>Técnicos con más resoluciones</h3>
      ${topTec.map(([tec, n]) => `<div class="stat-bar-row"><span class="stat-bar-label">${esc(tec)}</span><div class="stat-bar-track"><div class="stat-bar ok" style="width:${(n / maxTec) * 100}%"></div></div><span class="stat-bar-val">${n}</span></div>`).join("") || '<p class="stat-empty">Sin datos</p>'}
    </div>

    <div class="stat-section">
      <h3>Acciones más frecuentes</h3>
      ${topAcc.map(([acc, n]) => `<div class="stat-bar-row"><span class="stat-bar-label">${esc(acc)}</span><div class="stat-bar-track"><div class="stat-bar accent" style="width:${(n / maxAcc) * 100}%"></div></div><span class="stat-bar-val">${n}</span></div>`).join("") || '<p class="stat-empty">Sin datos</p>'}
    </div>

    ${totalPiezas ? `
    <div class="stat-section">
      <h3>Piezas cambiadas</h3>
      <div class="stats-row">
        <div class="stat-card mini ok"><div class="stat-num mid">${piezas.nueva}</div><div class="stat-label">Nuevas</div></div>
        <div class="stat-card mini accent"><div class="stat-num mid">${piezas["usada - probada"]}</div><div class="stat-label">Usadas probadas</div></div>
        <div class="stat-card mini danger"><div class="stat-num mid">${piezas["usada - dudosa"]}</div><div class="stat-label">Usadas dudosas</div></div>
      </div>
    </div>` : ""}

    <div class="stat-section">
      <h3>Exportar datos</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px">Descarga CSV compatible con Excel</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-sec btn-sm" id="expFallas">Exportar fallas</button>
        <button class="btn btn-sec btn-sm" id="expAcciones">Exportar acciones</button>
      </div>
    </div>
  `;

  $("expFallas").onclick = () => exportarCSV("fallas", todas);
  $("expAcciones").onclick = () => exportarCSV("acciones", accs);

  $("statsFiltroSeg").querySelectorAll("button").forEach(b => {
    b.onclick = () => { statsFiltro = b.dataset.sf; cargarStats(); };
  });
}

function formatMs(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 60) return min + " min";
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + "h";
  const dias = Math.floor(hrs / 24);
  return dias === 1 ? "1 día" : dias + " días";
}

function exportarCSV(tipo, datos) {
  if (!datos.length) { toast("Sin datos para exportar"); return; }
  const cols = Object.keys(datos[0]);
  const lineas = [cols.join(",")];
  datos.forEach(row => {
    lineas.push(cols.map(c => {
      let v = String(row[c] ?? "").replace(/"/g, '""');
      return v.includes(",") || v.includes("\n") || v.includes('"') ? '"' + v + '"' : v;
    }).join(","));
  });
  const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV descargado");
}
