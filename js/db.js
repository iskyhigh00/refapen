const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let TECNICOS = [];
let ACCIONES = {};
let TODAS = [];

async function cargarMaestros() {
  const [{ data: tecs }, { data: cats }] = await Promise.all([
    sb.from("tecnicos").select("*").eq("activo", true).order("nombre"),
    sb.from("catalogo_acciones").select("*").eq("activa", true).order("categoria").order("accion")
  ]);
  TECNICOS = (tecs || []).map(t => t.nombre);
  ACCIONES = {};
  (cats || []).forEach(c => {
    if (!ACCIONES[c.categoria]) ACCIONES[c.categoria] = [];
    ACCIONES[c.categoria].push(c.accion);
  });
  TODAS = Object.values(ACCIONES).flat();
}

async function audit(accion, detalle) {
  if (!tecnico) return;
  try {
    await sb.from("auditoria").insert({ tecnico, accion, detalle, created_at: new Date().toISOString() });
  } catch (e) {}
}
