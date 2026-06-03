let tecnico = localStorage.getItem("tecnico_fallas") || null;
let isObrist = tecnico?.toLowerCase() === "obrist";

function mostrarObrist() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center";
  const SEQ = [2, 0, 4, 1, 3];
  let prog = 0;
  let timer = null;

  function resetProg() {
    prog = 0;
    clearTimeout(timer);
    dots.querySelectorAll("div[data-i]").forEach(x => x.style.background = "var(--border)");
  }

  overlay.innerHTML = `
    <div style="font-size:48px;margin-bottom:16px">🚫</div>
    <div style="font-size:22px;font-weight:700;margin-bottom:8px">noo.. usted no es obrist, váyase.</div>
    <div style="font-size:14px;color:var(--muted);margin-bottom:40px">Este usuario no existe en este casino.</div>
    <div id="obristDots" style="display:flex;gap:20px;margin-bottom:32px"></div>
    <button style="background:none;border:1px solid var(--border);color:var(--muted);padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px" id="obristCerrar">Entendido</button>`;
  document.body.appendChild(overlay);

  const dots = overlay.querySelector("#obristDots");
  for (let i = 0; i < 5; i++) {
    const d = document.createElement("div");
    d.style.cssText = "width:22px;height:22px;border-radius:50%;background:var(--border);cursor:pointer;transition:.2s";
    d.dataset.i = i;
    d.onclick = () => {
      if (SEQ[prog] === i) {
        if (prog === 0) timer = setTimeout(() => resetProg(), 3000);
        prog++;
        if (prog === SEQ.length) {
          clearTimeout(timer);
          dots.innerHTML = '<div style="font-size:28px">✓</div>';
          setTimeout(() => {
            overlay.remove();
            const t = "Obrist";
            tecnico = t; isObrist = true;
            localStorage.setItem("tecnico_fallas", t);
            audit("login", { tecnico: t });
            iniciar();
          }, 600);
        }
      } else {
        resetProg();
      }
    };
    dots.appendChild(d);
  }
  overlay.querySelector("#obristCerrar").onclick = () => overlay.remove();
}

async function pintarLogin() {
  await cargarMaestros();
  $("tecGrid").innerHTML = "";
  TECNICOS.forEach(t => {
    const b = document.createElement("button");
    b.className = "tec-btn";
    b.textContent = t;
    b.onclick = () => {
      if (t.toLowerCase() === "obrist") { mostrarObrist(); return; }
      tecnico = t;
      isObrist = t.toLowerCase() === "obrist";
      localStorage.setItem("tecnico_fallas", t);
      audit("login", { tecnico: t });
      iniciar();
    };
    $("tecGrid").appendChild(b);
  });
}

async function iniciar() {
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("tecNombre").textContent = tecnico;
  if (isObrist) {
    const btn = document.createElement("button");
    btn.id = "btnObrist";
    btn.textContent = "⚡ Obrist";
    btn.style.cssText = "background:var(--danger);border:none;color:#fff;padding:7px 12px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:700";
    btn.onclick = () => { $("scrObrist").classList.remove("hidden"); cargarObrist(); };
    $("btnAdmin").insertAdjacentElement("beforebegin", btn);
  }
  pintarSync();
  sincronizar();
  await cargarMaestros();
  cargarLista();
}
