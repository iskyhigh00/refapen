const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let TECNICOS = [];
let TECNICOS_DATA = [];
let ACCIONES = {};
let TODAS = [];
let TOP_ACCIONES = [];

async function cargarMaestros() {
  const [{ data: tecs }, { data: cats }] = await Promise.all([
    sb.from("tecnicos").select("*").eq("activo", true).order("nombre"),
    sb.from("catalogo_acciones").select("*").eq("activa", true).order("categoria").order("accion")
  ]);
  TECNICOS_DATA = tecs || [];
  TECNICOS = TECNICOS_DATA.map(t => t.nombre);
  ACCIONES = {};
  (cats || []).forEach(c => {
    if (!ACCIONES[c.categoria]) ACCIONES[c.categoria] = [];
    ACCIONES[c.categoria].push(c.accion);
  });
  TODAS = Object.values(ACCIONES).flat();

  // Top acciones más usadas (vía RPC en Supabase)
  try {
    const { data: topData } = await sb.rpc("top_acciones", { limite: 10 });
    if (topData && topData.length) {
      TOP_ACCIONES = topData.map(r => r.accion).filter(a => TODAS.includes(a));
    }
  } catch (e) {
    console.log("TOP_ACCIONES catch:", e);
    TOP_ACCIONES = [];
  }
}

async function audit(accion, detalle) {
  if (!tecnico) return;
  try {
    await sb.from("auditoria").insert({ tecnico, accion, detalle, created_at: new Date().toISOString() });
  } catch (e) {}
}
