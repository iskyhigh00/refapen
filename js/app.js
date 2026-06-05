// Wiring de eventos globales — se ejecuta cuando el DOM está listo

// Cargar tema guardado
const temaGuardado = localStorage.getItem("tema_fallas");
if (temaGuardado) document.documentElement.setAttribute("data-theme", temaGuardado);

// Manejo de pantallas con historial del navegador
const SCREENS = ["scrMda", "scrNueva", "scrHist", "scrStats", "scrObrist", "scrAdmin"];

function abrirPantalla(id) {
  $(id).classList.remove("hidden");
  history.pushState({ screen: id }, "");
}

function hayAccionesSinGuardar() {
  for (const fid in accSel) {
    if (accSel[fid] && accSel[fid].length) return true;
  }
  return false;
}

function cerrarPantallaActual() {
  const abierta = SCREENS.find(id => !$(id).classList.contains("hidden"));
  if (abierta) {
    if (hayAccionesSinGuardar()) {
      confirmar("Tenes acciones sin guardar. Salir igual?", { ok: "Salir", danger: true }).then(ok => {
        if (ok) { $(abierta).classList.add("hidden"); cargarLista(); }
      });
      return false;
    }
    $(abierta).classList.add("hidden");
    return true;
  }
  return false;
}

function navegarConWarning(fn) {
  if (hayAccionesSinGuardar()) {
    confirmar("Tenes acciones sin guardar. Salir igual?", { ok: "Salir", danger: true }).then(ok => {
      if (ok) { accSel && Object.keys(accSel).forEach(k => accSel[k] = []); fn(); }
    });
  } else { fn(); }
}

window.addEventListener("popstate", e => {
  const cerro = cerrarPantallaActual();
  if (cerro) {
    // Recargar la lista principal al volver
    cargarLista();
  } else if (e.state === null) {
    history.pushState({}, "");
  }
});

// Push estado inicial para que el primer "atrás" no salga de la app
history.replaceState({}, "");

// cerrar pantallas con botones de volver
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => {
  $(b.dataset.close).classList.add("hidden");
  cargarLista();
  if (history.state?.screen) history.back();
});

// historial
$("btnHist").onclick = () => navegarConWarning(() => {
  abrirPantalla("scrHist");
  cargarHistorial();
  audit("abrir_historial", {});
});

// estadísticas
$("btnStats").onclick = () => navegarConWarning(() => {
  abrirPantalla("scrStats");
  cargarStats();
  audit("abrir_stats", {});
});

// búsqueda de MDA
$("buscarMda").oninput = () => {
  $("buscarMda").value = $("buscarMda").value.replace(/\D/g, "");
  const q = $("buscarMda").value;
  const cards = document.querySelectorAll(".mda-card");
  cards.forEach(card => {
    const texto = card.querySelector(".mda-id")?.textContent || "";
    card.style.display = (!q || texto.includes(q)) ? "" : "none";
  });
};

// nueva falla — validación en tiempo real
function validarNuevaFalla() {
  const mdaRaw = $("nMda").value.replace(/\D/g, "");
  const falla = $("nFalla").value.trim();
  let mdaOk = false, islaOk = false;

  // MDA
  if (!mdaRaw) {
    $("nMdaErr").textContent = "";
    $("nMda").style.borderColor = "";
  } else {
    const completo = mda6(mdaRaw);
    const num = parseInt(completo);
    if (num >= 100000 && num <= 101199) {
      mdaOk = true;
      $("nMdaErr").innerHTML = '<span style="color:var(--ok)">✓ MDA ' + completo + (mdaRaw.length < 6 ? ' <span style="color:var(--muted)">(autocompletado)</span>' : '') + '</span>';
      $("nMda").style.borderColor = "var(--ok)";
    } else {
      $("nMdaErr").innerHTML = '<span style="color:var(--danger)">Fuera de rango → ' + completo + '</span>';
      $("nMda").style.borderColor = "var(--danger)";
    }
  }

  // Isla (con posición opcional)
  const islaVal = $("nIsla").value.trim();
  if (!islaVal) {
    $("nIslaErr").textContent = "";
    $("nIsla").style.borderColor = "";
  } else {
    const p = parseIsla(islaVal);
    if (p.ok) {
      islaOk = true;
      const label = p.pos ? 'Isla ' + p.isla + ' · posición ' + p.pos : 'Isla ' + p.isla;
      $("nIslaErr").innerHTML = '<span style="color:var(--ok)">✓ ' + label + '</span>';
      $("nIsla").style.borderColor = "var(--ok)";
    } else {
      $("nIslaErr").innerHTML = '<span style="color:var(--danger)">Isla inválida (100–700, ej: 200 o 200-01)</span>';
      $("nIsla").style.borderColor = "var(--danger)";
    }
  }

  $("guardarFalla").disabled = !(mdaOk && islaOk && falla);
}

$("nMda").oninput = () => { $("nMda").value = $("nMda").value.replace(/\D/g, ""); validarNuevaFalla(); };
$("nIsla").oninput = () => { $("nIsla").value = $("nIsla").value.replace(/[^0-9-]/g, ""); validarNuevaFalla(); };
$("nFalla").oninput = validarNuevaFalla;

$("fabNueva").onclick = () => {
  $("nMda").value = ""; $("nIsla").value = ""; $("nFalla").value = "";
  $("nMdaErr").textContent = ""; $("nIslaErr").textContent = "";
  $("nMda").style.borderColor = ""; $("nIsla").style.borderColor = "";
  $("guardarFalla").disabled = true;
  abrirPantalla("scrNueva");
};
$("guardarFalla").onclick = async () => {
  const mda = mda6($("nMda").value);
  const falla = $("nFalla").value.trim();
  const mdaNum = parseInt(mda);
  if (isNaN(mdaNum) || mdaNum < 100000 || mdaNum > 101199) { toast("MDA inválido"); return; }
  const p = parseIsla($("nIsla").value);
  if (!p.ok) { toast("Isla inválida"); return; }
  if (!falla) { toast("Falta la falla"); return; }
  const isla = p.valor;
  const d = { mda, isla, falla, estado: "pendiente", tecnico, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (navigator.onLine) {
    const { error } = await sb.from("mdas_fallas").insert(d);
    if (error) { cola.push({ id: uid(), t: "falla", d }); guardarCola(); }
  } else {
    cola.push({ id: uid(), t: "falla", d }); guardarCola();
  }
  audit("crear_falla", { mda, isla, falla });
  toast("Falla creada");
  $("scrNueva").classList.add("hidden");
  await cargarLista();
  abrirMda(mda);
};

// admin
$("btnAdmin").onclick = () => navegarConWarning(async () => {
  if (!isObrist) {
    const clave = await preguntar("Clave de acceso:");
    if (clave === null) return;
    if (clave !== claveHora()) { toast("Clave incorrecta"); return; }
  }
  abrirPantalla("scrAdmin");
  cargarAdmin();
  audit("entrar_admin", {});
});

// cambiar usuario
function cambiarTecnico() {
  confirmar("¿Cambiar de técnico?", { ok: "Cambiar" }).then(ok => {
    if (!ok) return;
    audit("logout", { tecnico });
    $("app").classList.add("hidden");
    $("login").classList.remove("hidden");
    pintarLogin();
  });
}
$("badgeTec").onclick = cambiarTecnico;
$("mdaTecBadge").onclick = e => { e.stopPropagation(); cambiarTecnico(); };

// arranque
pintarLogin();
if (tecnico) iniciar();
