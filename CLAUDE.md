# Fallas MDA

## Qué es
App web (SPA) para gestionar fallas graves de máquinas MDA en casino. No es para el día a día — es para fallas que necesitan continuidad entre turnos. El siguiente técnico ve qué se intentó y qué funcionó.

## Stack
- **Frontend**: HTML/CSS/JS vanilla, modularizado
- **Backend**: Supabase (DB + Storage)
- **URL Supabase**: `https://wtwjerifitaeuaeaevqv.supabase.co`
- **Repo**: `iskyhigh00/refapen` — branch `main`

## Archivos
- `index.html` — SPA con todas las pantallas como divs hidden
- `css/styles.css` — 5 temas de color (oscuro, medianoche, oceano, claro, arena)
- `js/config.js` — URL Supabase + key + lista FAVS fallback
- `js/utils.js` — helpers: $, toast, confirmar(), preguntar(), tiempoDesde, mda6, esc
- `js/db.js` — cliente Supabase, cargarMaestros(), TECNICOS, TECNICOS_DATA, ACCIONES, TOP_ACCIONES
- `js/offline.js` — cola de sync offline
- `js/login.js` — login por técnico, combo secreto con loading dots, iniciar()
- `js/lista.js` — portada con cards de MDAs, urgencia visual, sortMode, volvioAFallar()
- `js/mda.js` — detalle MDA, renderFalla, acciones, fotos, galería, overlays cambio/firmware
- `js/historial.js` — fallas resueltas
- `js/obrist.js` — panel gestión: temas, carga masiva, borrado masivo
- `js/stats.js` — dashboard estadísticas + exportar CSV
- `js/admin.js` — catálogo de acciones + técnicos + permisos
- `js/app.js` — wiring global, historial navegador, búsqueda MDA

## Tablas Supabase
- `tecnicos` — nombre, activo, puede_sugerir
- `catalogo_acciones` — categoria, accion, activa
- `mdas_fallas` — mda, isla, falla, estado (pendiente/observacion/resuelta), tecnico, created_at, updated_at
- `acciones` — falla_id, accion, resultado (resolvio/no_resolvio/pendiente), tecnico, created_at, historial_resultados, anulada
- `uso_acciones` — accion (PK), total (contador permanente, RLS deshabilitado)
- `auditoria` — tecnico, accion, detalle, created_at
- **Storage bucket** `fotos` — público, política `fotos_allow_all`

## RPCs en Supabase
- `top_acciones(limite)` — lee de uso_acciones, devuelve top N
- `incrementar_uso(nombre)` — upsert atómico en uso_acciones

## Login secreto (admin)
- Usuario "Ricardo Obrist" NO aparece en la lista de técnicos
- Al seleccionar cualquier técnico aparecen 5 dots (loading falso)
- Secuencia secreta: `[2, 0, 4, 1, 3]` (índices 0-based)
- Timer base 2s, centro +2s, acierto +1s
- Si completa → entra como "Ricardo Obrist" con isObrist=true
- Si no → login normal como técnico seleccionado

## Permisos por perfil
- **Obrist**: ve todo (Resueltas, Reportes, Gestión, Catálogo), admin sin clave
- **Técnicos**: solo ven Resueltas, admin con clave (claveHora = HHMM)
- **puede_sugerir**: controla si técnico puede agregar acciones al catálogo

## Validaciones
- MDA: 100000–101199 (autocompleta: "11" → "100011")
- Isla: 100–700
- Solo números, feedback en tiempo real, botón disabled hasta válido

## Lógica de acciones
- Selector "Lo hice ✓ / No funcionó ✗ / Sugiero →" visible ANTES de elegir acciones
- "Sugiero" salta preguntas de pieza nueva/usada y firmware
- Cambio de pieza → pregunta nueva/usada → si usada: probada/dudosa
- Firmware/variant → pregunta versión, guarda en localStorage para reutilizar
- Volvió a fallar → anula acción anterior (tachada) + nueva entrada "no resolvió"

## Urgencia visual
- 2h+: borde rojo suave | 6h+: rojo medio | 12h+: rojo fuerte | 24h+: pulso

## Cosas pendientes / a mejorar
- Fotos: a veces no cargan al abrir (filtro de placeholders puede ser muy estricto)
- Permiso puede_sugerir: verificar que funcione correctamente en todos los casos
- Considerar notificaciones push para fallas urgentes
- Resumen de turno al cambiar técnico
