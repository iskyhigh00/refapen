let tecnico = localStorage.getItem("tecnico_fallas") || null;
let isObrist = tecnico?.toLowerCase() === "ricardo obrist";

const SECRET_SEQ = [2, 0, 4, 1, 3];

function mostrarCarga(tecSeleccionado) {
  // Deshabilitar botones mientras "carga"
  document.querySelectorAll(".tec-btn").forEach(b => { b.disabled = true; b.style.opacity = ".5"; });

  const loader = document.createElement("div");
  loader.style.cssText = "display:flex;gap:16px;justify-content:center;padding:24px 0 8px";
  loader.id = "loaderDots";

  let prog = 0;
  let completado = false;
  let animFrame = 0;
  let tiempoRestante = 2000;
  let ultimoTick = Date.now();

  // Crear 5 dots que parecen loading
  for (let i = 0; i < 5; i++) {
    const d = document.createElement("div");
    d.style.cssText = "width:14px;height:14px;border-radius:50%;background:var(--border);transition:background .3s;cursor:default";
    d.dataset.i = i;
    d.onclick = e => {
      e.stopPropagation();
      if (completado) return;
      if (i === 2) tiempoRestante += 2000; // centro: +2s
      if (SECRET_SEQ[prog] === i) {
        prog++;
        tiempoRestante += 1000; // acierto: +1s
        if (prog === SECRET_SEQ.length) {
          completado = true;
          clearInterval(anim);
          clearInterval(ticker);
          loader.querySelectorAll("div").forEach(x => x.style.background = "var(--ok)");
          setTimeout(() => {
            loader.remove();
            tecnico = "Ricardo Obrist";
            isObrist = true;
            localStorage.setItem("tecnico_fallas", "Ricardo Obrist");
            audit("login", { tecnico: "Ricardo Obrist" });
            iniciar();
          }, 400);
        }
      } else {
        prog = 0;
      }
    };
    loader.appendChild(d);
  }

  $("tecGrid").after(loader);

  // Animación de loading
  const dots = loader.querySelectorAll("div");
  const anim = setInterval(() => {
    if (completado) return;
    dots.forEach((d, i) => {
      d.style.background = i === animFrame % 5 ? "var(--ok)" : "var(--border)";
    });
    animFrame++;
  }, 350);

  // Ticker que descuenta tiempo y hace login cuando llega a 0
  const ticker = setInterval(() => {
    if (completado) { clearInterval(ticker); return; }
    const ahora = Date.now();
    tiempoRestante -= (ahora - ultimoTick);
    ultimoTick = ahora;
    if (tiempoRestante <= 0) {
      clearInterval(ticker);
      clearInterval(anim);
      loader.remove();
      tecnico = tecSeleccionado;
      isObrist = false;
      localStorage.setItem("tecnico_fallas", tecSeleccionado);
      audit("login", { tecnico: tecSeleccionado });
      iniciar();
    }
  }, 100);
}

async function pintarLogin() {
  await cargarMaestros();
  $("tecGrid").innerHTML = "";
  // Remover loader previo si existe
  const prevLoader = document.getElementById("loaderDots");
  if (prevLoader) prevLoader.remove();

  TECNICOS.filter(t => t.toLowerCase() !== "obrist" && t.toLowerCase() !== "ricardo obrist").forEach(t => {
    const b = document.createElement("button");
    b.className = "tec-btn";
    b.textContent = t;
    b.onclick = () => mostrarCarga(t);
    $("tecGrid").appendChild(b);
  });
}

async function iniciar() {
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("tecNombre").textContent = tecnico;
  if (isObrist) {
    $("btnStats").classList.remove("hidden");
    if (!document.getElementById("btnObrist")) {
      const btn = document.createElement("button");
      btn.id = "btnObrist";
      btn.textContent = "Gestión";
      btn.onclick = () => { abrirPantalla("scrObrist"); cargarObrist(); };
      $("btnAdmin").insertAdjacentElement("beforebegin", btn);
    }
  } else {
    $("btnStats").classList.add("hidden");
    const ob = document.getElementById("btnObrist");
    if (ob) ob.remove();
  }
  pintarSync();
  sincronizar();
  await cargarMaestros();
  cargarLista();
}
