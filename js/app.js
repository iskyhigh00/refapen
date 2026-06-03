// Wiring de eventos globales — se ejecuta cuando el DOM está listo

// cerrar pantallas
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => $(b.dataset.close).classList.add("hidden"));

// historial
$("btnHist").onclick = () => {
  $("scrHist").classList.remove("hidden");
  cargarHistorial();
  audit("abrir_historial", {});
};

// nueva falla
$("fabNueva").onclick = () => {
  $("nMda").value = ""; $("nIsla").value = ""; $("nFalla").value = "";
  $("scrNueva").classList.remove("hidden");
};
$("guardarFalla").onclick = async () => {
  const mda = mda6($("nMda").value);
  const isla = $("nIsla").value.trim();
  const falla = $("nFalla").value.trim();
  if (mda.length !== 6) { toast("MDA inválido"); return; }
  if (!isla) { toast("Falta isla"); return; }
  if (!falla) { toast("Falta la falla"); return; }
  const d = { mda, isla, falla, estado: "pendiente", tecnico, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (navigator.onLine) {
    const { error } = await sb.from("mdas_fallas").insert(d);
    if (error) { cola.push({ t: "falla", d }); guardarCola(); }
  } else {
    cola.push({ t: "falla", d }); guardarCola();
  }
  audit("crear_falla", { mda, isla, falla });
  toast("Falla creada"); $("scrNueva").classList.add("hidden"); cargarLista();
};

// admin
$("btnAdmin").onclick = () => {
  const clave = prompt("Clave admin:");
  if (clave !== claveHora()) { toast("Clave incorrecta"); return; }
  $("scrAdmin").classList.remove("hidden");
  cargarAdmin();
  audit("entrar_admin", {});
};

// cambiar usuario
$("badgeTec").onclick = () => {
  if (confirm("¿Cambiar de técnico?")) {
    audit("logout", { tecnico });
    $("app").classList.add("hidden");
    $("login").classList.remove("hidden");
    pintarLogin();
  }
};

// arranque
pintarLogin();
if (tecnico) iniciar();
