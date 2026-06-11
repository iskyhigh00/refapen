let realtimeChannel = null;
let reloadTimer = null;
let mdaActual = null; // MDA abierto actualmente en scrMda

function iniciarRealtime() {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);

  realtimeChannel = sb.channel("fallas-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "mdas_fallas" }, agendarRecarga)
    .on("postgres_changes", { event: "*", schema: "public", table: "acciones" }, agendarRecarga)
    .subscribe();
}

function detenerRealtime() {
  if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
  clearTimeout(reloadTimer);
}

function agendarRecarga() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    if (!tecnico) return;
    await cargarLista();
    if (mdaActual && !$("scrMda").classList.contains("hidden")) {
      abrirMda(mdaActual);
    }
  }, 800);
}
