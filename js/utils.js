function getCfg(key, def) {
  const v = localStorage.getItem("cfg_" + key);
  return v !== null ? parseFloat(v) : def;
}
function setCfg(key, val) {
  localStorage.setItem("cfg_" + key, String(val));
}



function toast(m) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = m;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function diasDesde(iso) {
  return Math.floor((Date.now() - new Date(iso)) / 86400000);
}

function horasDesde(iso) {
  return (Date.now() - new Date(iso)) / 3600000;
}

function ageClass(d) {
  return d >= 3 ? "age-2" : d >= 1 ? "age-1" : "age-0";
}

function ageTxt(d) {
  return d === 0 ? "hoy" : d === 1 ? "1 día" : d + " días";
}

function urgenciaStyle(iso, estado) {
  if (estado !== "pendiente") return "";
  const h = horasDesde(iso);
  const t = getCfg("horas_urgente", 2);
  if (h < t) return "";
  if (h < t * 3) return "border-color:rgba(218,54,51,.4);background:rgba(218,54,51,.05)";
  if (h < t * 6) return "border-color:rgba(218,54,51,.7);background:rgba(218,54,51,.1)";
  return "border-color:#da3633;background:rgba(218,54,51,.18)";
}

function fmtFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL") + " " + d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function mda6(v) {
  v = v.replace(/\D/g, "");
  if (v.length <= 3) return "100" + v.padStart(3, "0");
  if (v.length === 4) return "10" + v;
  if (v.length === 5) return "1" + v;
  return v.slice(-6);
}

// Parsea isla con posición opcional: "200", "200-01", "20001" → { isla: 200, pos: "01"|null, valor: "200-01"|"200", ok: true }
function parseIsla(raw) {
  raw = (raw || "").trim();
  // Formato con guión: 200-01
  let m = raw.match(/^(\d{3})-(\d{1,2})$/);
  if (m) {
    const isla = parseInt(m[1]);
    const pos = m[2].padStart(2, "0");
    if (isla >= 100 && isla <= 700) return { isla, pos, valor: isla + "-" + pos, ok: true };
    return { ok: false };
  }
  // Formato 5 dígitos sin guión: 20001
  if (/^\d{5}$/.test(raw)) {
    const isla = parseInt(raw.slice(0, 3));
    const pos = raw.slice(3);
    if (isla >= 100 && isla <= 700) return { isla, pos, valor: isla + "-" + pos, ok: true };
    return { ok: false };
  }
  // Formato 4 dígitos sin guión: 2001 (isla 200, pos 1)
  if (/^\d{4}$/.test(raw)) {
    const isla = parseInt(raw.slice(0, 3));
    const pos = raw.slice(3).padStart(2, "0");
    if (isla >= 100 && isla <= 700) return { isla, pos, valor: isla + "-" + pos, ok: true };
    return { ok: false };
  }
  // Solo isla: 200
  if (/^\d{3}$/.test(raw)) {
    const isla = parseInt(raw);
    if (isla >= 100 && isla <= 700) return { isla, pos: null, valor: String(isla), ok: true };
    return { ok: false };
  }
  return { ok: false };
}

function esc(s) {
  return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function claveHora() {
  const n = new Date();
  return String(n.getHours()).padStart(2, "0") + String(n.getMinutes()).padStart(2, "0");
}

// === Overlays personalizados (reemplazan confirm/prompt) ===

function confirmar(msg, opts = {}) {
  return new Promise(resolve => {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px";
    const box = document.createElement("div");
    box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:340px";
    box.innerHTML = `
      <div style="font-size:15px;font-weight:600;margin-bottom:16px;line-height:1.4">${esc(msg)}</div>
      <button class="btn ${opts.danger ? 'btn-danger' : 'btn-ok'}" style="margin-top:0">${esc(opts.ok || "Confirmar")}</button>
      <button class="btn btn-sec" style="margin-top:10px">${esc(opts.cancel || "Cancelar")}</button>`;
    ov.appendChild(box);
    document.body.appendChild(ov);
    const btns = box.querySelectorAll("button");
    btns[0].onclick = () => { ov.remove(); resolve(true); };
    btns[1].onclick = () => { ov.remove(); resolve(false); };
    ov.onclick = e => { if (e.target === ov) { ov.remove(); resolve(false); } };
  });
}

function preguntar(msg, valor = "") {
  return new Promise(resolve => {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px";
    const box = document.createElement("div");
    box.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:340px";
    box.innerHTML = `
      <div style="font-size:15px;font-weight:600;margin-bottom:12px;line-height:1.4">${esc(msg)}</div>
      <input type="text" id="pregInput" value="${esc(valor)}" style="margin-bottom:0">
      <button class="btn btn-ok" style="margin-top:12px">Aceptar</button>
      <button class="btn btn-sec" style="margin-top:10px">Cancelar</button>`;
    ov.appendChild(box);
    document.body.appendChild(ov);
    const inp = box.querySelector("input");
    const btns = box.querySelectorAll("button");
    setTimeout(() => inp.focus(), 100);
    inp.onkeydown = e => { if (e.key === "Enter") { ov.remove(); resolve(inp.value.trim()); } };
    btns[0].onclick = () => { ov.remove(); resolve(inp.value.trim()); };
    btns[1].onclick = () => { ov.remove(); resolve(null); };
    ov.onclick = e => { if (e.target === ov) { ov.remove(); resolve(null); } };
  });
}

function tiempoDesde(iso) {
  const ms = Date.now() - new Date(iso);
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return min + " min";
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs + "h " + (min % 60) + "min";
  const dias = Math.floor(hrs / 24);
  return dias === 1 ? "1 día" : dias + " días";
}
