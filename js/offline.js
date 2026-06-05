let cola = JSON.parse(localStorage.getItem("cola_fallas") || "[]");
const sincronizados = new Set(JSON.parse(localStorage.getItem("sync_ok") || "[]"));

function guardarCola() {
  localStorage.setItem("cola_fallas", JSON.stringify(cola));
  pintarSync();
}

function marcarSync(id) {
  sincronizados.add(id);
  const arr = [...sincronizados];
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  localStorage.setItem("sync_ok", JSON.stringify(arr));
}

function pintarSync(sincronizando) {
  const on = navigator.onLine;
  $("netDot").className = "offline-dot" + (on ? "" : " off");
  const pill = $("syncPill");
  if (sincronizando) {
    pill.textContent = "↑ sincronizando…";
    pill.style.color = "var(--accent)";
  } else if (cola.length) {
    pill.textContent = "• " + cola.length + " pendiente" + (cola.length > 1 ? "s" : "");
    pill.style.color = "var(--warn)";
    pill.style.fontWeight = "700";
  } else {
    pill.textContent = "";
    pill.style.color = "";
    pill.style.fontWeight = "";
  }
}

window.addEventListener("online", () => { pintarSync(); sincronizar(); });
window.addEventListener("offline", pintarSync);

async function sincronizar() {
  if (!navigator.onLine || !cola.length) return;
  pintarSync(true);
  const pendientes = [...cola];
  cola = [];
  guardarCola();
  for (const op of pendientes) {
    const opId = op.id || (op.t + "_" + JSON.stringify(op.d)).slice(0, 100);
    if (sincronizados.has(opId)) continue;
    try {
      if (op.t === "falla") {
        const { error } = await sb.from("mdas_fallas").insert(op.d);
        if (error) throw error;
      } else if (op.t === "accion") {
        const { error } = await sb.from("acciones").insert(op.d);
        if (error) throw error;
      } else if (op.t === "estado") {
        const { error } = await sb.from("mdas_fallas").update({ estado: op.d.estado, updated_at: new Date().toISOString() }).eq("id", op.d.id);
        if (error) throw error;
      } else if (op.t === "foto") {
        const resp = await fetch(op.d.base64);
        const blob = await resp.blob();
        const { error } = await sb.storage.from("fotos").upload(op.d.path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
      }
      marcarSync(opId);
    } catch (e) {
      cola.push(op);
    }
  }
  guardarCola();
  cargarLista();
}
