const $ = id => document.getElementById(id);

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

function ageClass(d) {
  return d >= 3 ? "age-2" : d >= 1 ? "age-1" : "age-0";
}

function ageTxt(d) {
  return d === 0 ? "hoy" : d === 1 ? "1 día" : d + " días";
}

function fmtFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL") + " " + d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function mda6(v) {
  v = v.replace(/\D/g, "");
  if (v.length === 3) return "100" + v;
  if (v.length === 4) return "10" + v;
  return v.padStart(6, "0").slice(-6);
}

function esc(s) {
  return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function claveHora() {
  const n = new Date();
  return String(n.getHours()).padStart(2, "0") + String(n.getMinutes()).padStart(2, "0");
}
