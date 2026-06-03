let cola = JSON.parse(localStorage.getItem("cola_fallas") || "[]");

function guardarCola() {
  localStorage.setItem("cola_fallas", JSON.stringify(cola));
  pintarSync();
}

function pintarSync() {
  const on = navigator.onLine;
  $("netDot").className = "offline-dot" + (on ? "" : " off");
  $("syncPill").textContent = cola.length ? ("• " + cola.length + " sin sincronizar") : "";
}

window.addEventListener("online", () => { pintarSync(); sincronizar(); });
window.addEventListener("offline", pintarSync);

async function sincronizar() {
  if (!navigator.onLine || !cola.length) return;
  const pendientes = [...cola];
  cola = [];
  guardarCola();
  for (const op of pendientes) {
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
      }
    } catch (e) {
      cola.push(op);
    }
  }
  guardarCola();
  cargarLista();
}
