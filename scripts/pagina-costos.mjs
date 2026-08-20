/**
 * Arma la página de registro de costos a partir de lo que se midió de verdad.
 *
 * Fuentes, todas reales:
 *   - Totales de la corrida completa del 19/08 (3000 mensajes + 100 min + 100 fotos).
 *   - Detalle línea por línea de la recorrida del 20/08 (medicion/carga-masiva.json),
 *     que alcanzó las 662 notas de voz enteras y 597 mensajes antes de que se
 *     acabara el saldo de la llave.
 *   - Los 31 turnos que sí pasaron por WhatsApp de verdad (medicion/live-turnos.csv).
 *
 * Nada acá está estimado: cada fila conserva la factura que devolvió el modelo.
 *
 *   node scripts/pagina-costos.mjs
 */
import fs from "node:fs";

const RAIZ = "medicion/";
const SALIDA = RAIZ + "cuenta-de-sofia.html";

// ── La corrida completa: sus totales son los que manda la página ──
const COMPLETA = {
  fecha: "19 de agosto de 2026",
  segundos: 686,
  bloques: {
    texto: { n: 3000, llamadas: 3930, entrada: 19477356, salida: 265304, costo: 20.803876, p50: 1744, p95: 3309, errores: 0 },
    audio: { n: 662, llamadas: 662, entrada: 254793, salida: 18473, costo: 0.122716, p50: 961, p95: 1314, errores: 0 },
    imagenes: { n: 100, llamadas: 111, entrada: 670899, salida: 10417, costo: 0.722984, p50: 2685, p95: 4277, errores: 0, tokensImagen: 125985 },
  },
};

const MODELO = { texto: "claude-haiku-4-5", audio: "gemini-3.5-flash-lite", imagenes: "claude-haiku-4-5" };

const ent = (n) => new Intl.NumberFormat("es-ES").format(Math.round(n));
const usd = (n, d = 6) => "$" + n.toFixed(d);
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Detalle línea por línea de la recorrida del 20 ──
const recorrida = JSON.parse(fs.readFileSync(RAIZ + "carga-masiva.json", "utf8"));
const detalle = {};
for (const b of recorrida.bloques) detalle[b.nombre] = b.unidades ?? [];

// ── Los turnos que de verdad pasaron por WhatsApp ──
function leerCsv(ruta) {
  const lineas = fs.readFileSync(ruta, "utf8").trim().split(/\r?\n/);
  const cab = lineas[0].split(",");
  return lineas.slice(1).map((l) => {
    // Partir respetando las comillas: hay nombres de archivo con comas adentro.
    const campos = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, ""));
    return Object.fromEntries(cab.map((k, i) => [k, campos[i] ?? ""]));
  });
}
const turnos = leerCsv(RAIZ + "live-turnos.csv");

// ── Aclaraciones al pasar el mouse. Cada término se explica una sola vez ──
const GLOSARIO = {
  token:
    "Un pedacito de texto, más o menos tres cuartos de una palabra. Los modelos no cobran por mensaje, cobran por pedacito.",
  entrada:
    "Todo lo que el modelo tuvo que LEER antes de poder contestar: el mensaje del huésped, el guion de Sofía, las tres sedes con sus habitaciones y precios, las promociones encendidas y lo que ya se habían dicho antes. Acá está casi toda la cuenta.",
  salida:
    "Lo que el modelo ESCRIBIÓ. Es poco texto, así que pesa poco en la cuenta, aunque cada pedacito de salida cueste cinco veces más que uno de entrada.",
  llamadas:
    "Cuántas veces hubo que ir a preguntarle al modelo para resolver UNA sola cosa. Si Sofía consulta la disponibilidad y recién después contesta, son dos viajes, y en cada viaje se vuelve a leer todo desde cero.",
  p50: "La mitad de las respuestas salió más rápido que esto. Es el día normal.",
  p95: "95 de cada 100 respuestas salieron más rápido que esto. Es el peor caso realista, que es lo que conviene mirar y no el promedio.",
  modelo:
    "Qué inteligencia artificial se contrató para esa tarea. A propósito no es la misma para todo: oír una nota de voz no necesita el mismo cerebro que atender a un huésped, y cuesta muchísimo menos.",
  unitario:
    "Lo que costó atender una sola vez, en promedio. Es el número que hay que multiplicar por el volumen real del hotel para saber la factura del mes.",
  detalle:
    "Cuántas de esas atenciones quedaron anotadas una por una acá abajo, con su factura propia. El resto está contado en el total pero no tiene su línea.",
  espera:
    "Lo que pasó desde que entró el mensaje hasta que salió la respuesta. Incluye los segundos que el agente espera a propósito para no contestar al instante como un robot, así que no se compara con los milisegundos de la prueba de arriba.",
  tokensfoto:
    "De todo lo que el modelo leyó, cuánto fue la foto en sí. El modelo no mira píxeles: parte la imagen en cuadritos y cada cuadrito le cuesta.",
};
const tip = (texto, clave) => `<span class="q" tabindex="0" data-tip="${esc(GLOSARIO[clave])}">${texto}</span>`;

// ── Los cuatro capítulos del registro ──
const BLOQUES = [
  {
    id: "texto",
    tono: "marca",
    titulo: "Mensajes de texto",
    unidad: "mensaje",
    unidades: "mensajes",
    columna: "Lo que escribió el huésped",
    nota:
      "Cada línea es un mensaje que llegó y la respuesta que Sofía escribió. Los mensajes venían agrupados en conversaciones de uno a cuatro turnos, así que muchos cargan encima lo que ya se habían dicho antes: por eso, dentro de una misma charla, cada mensaje sale un poco más caro que el anterior.",
    filas: detalle.texto.map((u) => [u.que, u.llamadas, u.entrada, u.salida, +u.costo.toFixed(8), u.ms]),
    detalleNota:
      "597 de los 3.000 quedaron anotados uno por uno. Los otros se midieron el 19 y se cobraron, pero su línea se perdió porque el registro fila por fila se agregó después. Al volver a correrlo para recuperarlas, el saldo de la llave se terminó a los 597.",
  },
  {
    id: "audio",
    tono: "onda",
    titulo: "Notas de voz",
    unidad: "nota",
    unidades: "notas",
    columna: "Nota de voz y cuánto duraba",
    nota:
      "Cada línea es una nota de voz convertida en texto. Acá NO está lo que cuesta contestarla: eso ya se pagó arriba, entre los mensajes. Esto es solamente oírla y escribir lo que dijo.",
    filas: detalle.audio.map((u) => [u.que, u.llamadas, u.entrada, u.salida, +u.costo.toFixed(8), u.ms]),
    detalleNota: "Las 662 quedaron anotadas una por una: son los 100 minutos enteros, completos.",
  },
  {
    id: "imagenes",
    tono: "arena",
    titulo: "Fotos",
    unidad: "foto",
    unidades: "fotos",
    columna: "Foto que mandó el huésped",
    nota:
      "Cada línea es una foto que llegó por WhatsApp y que Sofía miró antes de contestar. Mirar la foto es apenas una parte de lo que se paga: el resto es el mismo guion de siempre, que viaja entero en cada consulta.",
    filas: [],
    detalleNota:
      "Las 100 fotos de la prueba se midieron y se cobraron el 19, pero ninguna quedó anotada una por una: al volver a correr la prueba, el saldo se acabó antes de llegar a este bloque. El detalle foto por foto que sí existe está más abajo, en los turnos que pasaron por WhatsApp de verdad.",
  },
];

const total = BLOQUES.reduce((s, b) => s + COMPLETA.bloques[b.id].costo, 0);
const unidades = BLOQUES.reduce((s, b) => s + COMPLETA.bloques[b.id].n, 0);
const llamadas = BLOQUES.reduce((s, b) => s + COMPLETA.bloques[b.id].llamadas, 0);

// ── Producción: lo que sí salió por WhatsApp ──
const prodFilas = turnos.map((t) => {
  const foto = t.tipo === "imagen";
  const que = foto
    ? `Foto de ${ent(t.ancho)} x ${ent(t.alto)} px, ${ent(t.kb)} KB · charla ${t.conversacion}`
    : `Solo texto · charla ${t.conversacion}`;
  return [que, 1, +t.tokens_prompt, +t.tokens_salida, +Number(t.costo).toFixed(8), Math.round(+t.segundos * 1000), foto ? +t.tokens_imagen : 0];
});
const prodTotal = prodFilas.reduce((s, f) => s + f[4], 0);
const prodFotos = prodFilas.filter((f) => f[6] > 0);
const prodTokensFoto = prodFotos.reduce((s, f) => s + f[6], 0);

// ── Armado ──
function cifras(b) {
  const c = COMPLETA.bloques[b.id];
  const items = [
    [tip("Modelo", "modelo"), `<span class="mono chico">${esc(MODELO[b.id])}</span>`],
    [tip("Costo por " + b.unidad, "unitario"), `<span class="mono">${usd(c.costo / c.n)}</span>`],
    [tip("Consultas al modelo", "llamadas"), `<span class="mono">${ent(c.llamadas)}</span>`],
    [tip("Tokens de entrada", "entrada"), `<span class="mono">${ent(c.entrada)}</span>`],
    [tip("Tokens de salida", "salida"), `<span class="mono">${ent(c.salida)}</span>`],
    [`Tardanza <span class="tenue">${tip("p50", "p50")} / ${tip("p95", "p95")}</span>`, `<span class="mono">${ent(c.p50)} / ${ent(c.p95)} ms</span>`],
  ];
  if (c.tokensImagen) {
    items.splice(4, 0, [tip("De eso, las fotos", "tokensfoto"), `<span class="mono">${ent(c.tokensImagen)}</span>`]);
  }
  return `<dl class="cifras">${items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}

function tabla(id, columna, n, unidades, tiempo = "ms") {
  if (!n) return "";
  return `<div class="tabla-caja" data-tabla="${id}">
    <div class="filtro">
      <label class="oculto" for="f-${id}">Buscar</label>
      <input id="f-${id}" type="search" placeholder="Buscar entre ${ent(n)} ${unidades}" autocomplete="off">
      <span class="conteo" data-conteo></span>
    </div>
    <div class="scroll">
      <table>
        <thead><tr>
          <th class="num">#</th>
          <th>${columna}</th>
          <th class="num">${tip("Consultas", "llamadas")}</th>
          <th class="num">${tip("Entrada", "entrada")}</th>
          <th class="num">${tip("Salida", "salida")}</th>
          <th class="num">${tiempo === "s" ? tip("Demora", "espera") : "ms"}</th>
          <th class="num">Costo</th>
        </tr></thead>
        <tbody data-cuerpo></tbody>
      </table>
    </div>
    <div class="mas"><button type="button" data-mas>Mostrar más</button><button type="button" class="ghost" data-todo>Mostrar todas</button></div>
  </div>`;
}

const secciones = BLOQUES.map((b) => {
  const c = COMPLETA.bloques[b.id];
  const hay = b.filas.length;
  return `<section id="b-${b.id}" class="bloque" style="--tono:var(--${b.tono})">
  <header class="bloque-cab">
    <h2>${b.titulo}</h2>
    <p class="cuenta"><strong class="mono">${ent(c.n)}</strong> ${b.unidades}</p>
    <p class="plata mono">${usd(c.costo)}</p>
  </header>
  <p class="bloque-nota">${b.nota}</p>
  ${cifras(b)}
  <p class="detalle-nota"><strong>${hay ? ent(hay) + " " + tip("anotadas una por una", "detalle") : "Sin detalle línea por línea"}.</strong> ${b.detalleNota}</p>
  ${tabla(b.id, b.columna, hay, b.unidades)}
</section>`;
}).join("\n");

const resumen = BLOQUES.map((b) => {
  const c = COMPLETA.bloques[b.id];
  return `<a class="pastilla" href="#b-${b.id}" style="--tono:var(--${b.tono})">
    <span class="pastilla-que">${b.titulo}</span>
    <span class="pastilla-plata mono">${usd(c.costo, 2)}</span>
    <span class="pastilla-n mono">${ent(c.n)} ${b.unidades}</span>
  </a>`;
}).join("\n    ");

const DATOS = {
  texto: { filas: BLOQUES[0].filas },
  audio: { filas: BLOQUES[1].filas },
  produccion: { filas: prodFilas, tiempo: "s" },
};
for (const k of Object.keys(DATOS)) {
  DATOS[k].max = DATOS[k].filas.length ? Math.max(...DATOS[k].filas.map((f) => f[4])) : 0;
}

const html = `<title>Cuenta de Sofía</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Public+Sans:wght@400;600&family=Zilla+Slab:wght@400;600&display=swap">
<style>
:root{
  --papel:#F3F6F9; --ficha:#FFFFFF; --tinta:#0F2230; --tinta2:#5A7080; --linea:#D8E1E9;
  --marca:#1C415D; --onda:#256E69; --arena:#9E5A29;
  --barra:rgba(28,65,93,.10);
  --sombra:0 1px 2px rgba(15,34,48,.05), 0 10px 26px -18px rgba(15,34,48,.35);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --papel:#0A1520; --ficha:#101E2A; --tinta:#E1EAF1; --tinta2:#8CA1B1; --linea:#1F303D;
    --marca:#7BADCD; --onda:#5CB8AF; --arena:#DB9560;
    --barra:rgba(123,173,205,.16);
    --sombra:0 1px 2px rgba(0,0,0,.45), 0 10px 26px -18px rgba(0,0,0,.9);
  }
}
:root[data-theme="dark"]{
  --papel:#0A1520; --ficha:#101E2A; --tinta:#E1EAF1; --tinta2:#8CA1B1; --linea:#1F303D;
  --marca:#7BADCD; --onda:#5CB8AF; --arena:#DB9560;
  --barra:rgba(123,173,205,.16);
  --sombra:0 1px 2px rgba(0,0,0,.45), 0 10px 26px -18px rgba(0,0,0,.9);
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--papel); color:var(--tinta);
  font-family:"Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:16px; line-height:1.6; -webkit-text-size-adjust:100%;
}
.hoja{max-width:1040px; margin:0 auto; padding:clamp(28px,5vw,72px) clamp(16px,4vw,32px) 88px; display:flex; flex-direction:column; gap:clamp(36px,5vw,56px)}
h1,h2,h3{font-family:"Zilla Slab",Georgia,serif; font-weight:600; text-wrap:balance; margin:0; letter-spacing:-.012em}
p{margin:0}
a{color:var(--marca)}
.mono,td.num,th.num,.plata-grande{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace; font-variant-numeric:tabular-nums; font-feature-settings:"zero" 0}
.tenue{color:var(--tinta2)}
.chico{font-size:.8rem}
.oculto{position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap}

.cab{display:flex; flex-direction:column; gap:18px}
.rotulo{font-size:.71rem; text-transform:uppercase; letter-spacing:.17em; color:var(--tinta2); font-weight:600}
.cab h1{font-size:clamp(2.3rem,6.5vw,3.5rem); line-height:1.04}
.bajada{max-width:62ch; color:var(--tinta2); font-size:1.04rem}
.total{display:flex; flex-wrap:wrap; align-items:baseline; gap:10px 24px; border-top:2px solid var(--tinta); border-bottom:1px solid var(--linea); padding:22px 0; margin-top:6px}
.total .plata-grande{font-family:"IBM Plex Mono",monospace; font-variant-numeric:tabular-nums; font-size:clamp(2.7rem,9vw,4.2rem); font-weight:500; line-height:1; letter-spacing:-.035em}
.total .glosa{color:var(--tinta2); font-size:.95rem; max-width:38ch}
.pastillas{display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:12px}
.pastilla{
  display:grid; gap:1px; text-decoration:none; color:inherit; background:var(--ficha);
  border:1px solid var(--linea); border-left:3px solid var(--tono); border-radius:3px;
  padding:12px 15px; box-shadow:var(--sombra); transition:transform .15s ease;
}
.pastilla:hover{transform:translateY(-2px)}
.pastilla-que{font-weight:600; font-size:.92rem}
.pastilla-plata{font-size:1.5rem; color:var(--tono); line-height:1.2}
.pastilla-n{font-size:.78rem; color:var(--tinta2)}

.bloque{background:var(--ficha); border:1px solid var(--linea); border-top:3px solid var(--tono); border-radius:3px; box-shadow:var(--sombra); padding:clamp(20px,3.2vw,32px); display:flex; flex-direction:column; gap:20px; scroll-margin-top:20px}
.bloque-cab{display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 16px}
.bloque-cab h2{font-size:1.55rem; margin-right:auto}
.cuenta{color:var(--tinta2); font-size:.94rem}
.cuenta strong{color:var(--tinta)}
.plata{font-size:1.65rem; color:var(--tono); width:100%; text-align:right; line-height:1.1}
.bloque-nota{color:var(--tinta2); max-width:74ch}
.cifras{display:grid; grid-template-columns:repeat(auto-fit,minmax(158px,1fr)); gap:0; margin:0; background:var(--ficha); border:1px solid var(--linea); border-radius:2px}
.cifras>div{padding:10px 13px; display:flex; flex-direction:column; gap:1px; box-shadow:1px 0 0 var(--linea), 0 1px 0 var(--linea)}
.cifras dt{font-size:.71rem; text-transform:uppercase; letter-spacing:.08em; color:var(--tinta2); font-weight:600}
.cifras dd{margin:0; font-size:1.05rem}
.detalle-nota{font-size:.9rem; color:var(--tinta2); border-left:2px solid var(--tono); padding-left:14px; max-width:74ch}
.detalle-nota strong{color:var(--tinta)}

.tabla-caja{display:flex; flex-direction:column; gap:12px}
.filtro{display:flex; align-items:center; gap:12px; flex-wrap:wrap}
.filtro input{flex:1 1 200px; min-width:0; font:inherit; font-size:.9rem; color:var(--tinta); background:var(--papel); border:1px solid var(--linea); border-radius:2px; padding:8px 11px}
.filtro input:focus-visible{outline:2px solid var(--tono); outline-offset:1px}
.conteo{font-family:"IBM Plex Mono",monospace; font-size:.78rem; color:var(--tinta2); font-variant-numeric:tabular-nums}
.scroll{overflow:auto; max-height:min(62vh,560px); border:1px solid var(--linea); border-radius:2px}
table{border-collapse:collapse; width:100%; font-size:.85rem}
thead th{position:sticky; top:0; z-index:2; background:var(--ficha); text-align:left; font-weight:600; font-size:.7rem; text-transform:uppercase; letter-spacing:.07em; color:var(--tinta2); padding:9px 12px; border-bottom:1px solid var(--linea); white-space:nowrap}
tbody td{padding:7px 12px; border-bottom:1px solid var(--linea); vertical-align:top}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover td{background:var(--barra)}
td.num,th.num{text-align:right; font-family:"IBM Plex Mono",monospace; font-variant-numeric:tabular-nums; white-space:nowrap}
td.que{min-width:20ch; max-width:46ch}
td.costo{position:relative; color:var(--tono); font-weight:500}
td.costo i{position:absolute; inset:2px 2px 2px auto; right:2px; width:calc(var(--p)*100%); background:var(--barra); border-radius:1px}
td.costo span{position:relative}
.mas{display:flex; gap:10px; flex-wrap:wrap}
.mas button{font:inherit; font-size:.84rem; font-weight:600; color:var(--ficha); background:var(--tono); border:1px solid var(--tono); border-radius:2px; padding:7px 15px; cursor:pointer}
.mas button.ghost{background:transparent; color:var(--tono)}
.mas button:hover{opacity:.85}
.mas button:focus-visible{outline:2px solid var(--tinta); outline-offset:2px}
.mas button[hidden]{display:none}

.q{border-bottom:1px dotted currentColor; cursor:help; position:relative; outline:none}
.q::after{
  content:attr(data-tip); position:absolute; left:0; top:calc(100% + 8px); z-index:30;
  display:none; width:max-content; max-width:min(310px,72vw); padding:10px 13px;
  background:var(--tinta); color:var(--papel); border-radius:3px;
  box-shadow:0 12px 32px -14px rgba(0,0,0,.6);
  font-family:"Public Sans",sans-serif; font-size:.79rem; font-weight:400; line-height:1.5;
  letter-spacing:0; text-transform:none; white-space:normal; pointer-events:none;
}
/* Escondido con display:none a proposito: con visibility:hidden el globo seguia
   ocupando lugar y empujaba la pagina de lado en el telefono. */
.q:hover::after,.q:focus-visible::after{display:block}
.q.al-reves::after{left:auto; right:0}

.cierre{display:grid; grid-template-columns:repeat(auto-fit,minmax(270px,1fr)); gap:30px; border-top:1px solid var(--linea); padding-top:34px}
.cierre h3{font-size:1.1rem; margin-bottom:8px}
.cierre p{color:var(--tinta2); font-size:.93rem; max-width:58ch}
.cierre p+p{margin-top:10px}
.cierre strong{color:var(--tinta)}
code{font-family:"IBM Plex Mono",monospace; font-size:.84em; background:var(--barra); padding:2px 6px; border-radius:2px; overflow-wrap:anywhere}
.pie{color:var(--tinta2); font-size:.81rem; border-top:1px solid var(--linea); padding-top:20px; max-width:80ch}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

<div class="hoja">
  <header class="cab">
    <p class="rotulo">Yali Hospitality · prueba de carga del ${COMPLETA.fecha}</p>
    <h1>Cuenta de Sofía</h1>
    <p class="bajada">Se puso a trabajar al agente hasta el volumen de un mes entero de hotel y se anotó qué atendió y qué costó atenderlo. Ninguna cifra de esta página está calculada a ojo: todas salen de la factura que devolvió cada consulta en el momento.</p>
    <div class="total">
      <p class="plata-grande">${usd(total, 2)}</p>
      <p class="glosa">${ent(unidades)} atenciones y ${ent(llamadas)} ${tip("consultas a los modelos", "llamadas")}, sin una sola falla, en ${Math.round(COMPLETA.segundos / 60)} minutos.</p>
    </div>
    <nav class="pastillas" aria-label="Los tres bloques de la prueba">
    ${resumen}
    </nav>
  </header>

${secciones}

  <section id="b-produccion" class="bloque" style="--tono:var(--marca)">
    <header class="bloque-cab">
      <h2>Y esto sí salió por WhatsApp</h2>
      <p class="cuenta"><strong class="mono">${prodFilas.length}</strong> turnos de verdad</p>
      <p class="plata mono">${usd(prodTotal)}</p>
    </header>
    <p class="bloque-nota">Todo lo de arriba se midió llamando a los modelos sin pasar por WhatsApp. Estos ${prodFilas.length} turnos son lo contrario: mensajes que de verdad viajaron por WhatsApp, con ${prodFotos.length} fotos que Sofía miró de verdad, en cuatro conversaciones seguidas. Sirven para dos cosas: confirmar que el banco de pruebas cobra lo mismo que la realidad, y dar el detalle foto por foto que a la prueba de arriba le faltó.</p>
    <dl class="cifras">
      <div><dt>${tip("Modelo", "modelo")}</dt><dd><span class="mono chico">claude-haiku-4-5</span></dd></div>
      <div><dt>Turnos con foto</dt><dd><span class="mono">${prodFotos.length} de ${prodFilas.length}</span></dd></div>
      <div><dt>Costo por turno</dt><dd><span class="mono">${usd(prodTotal / prodFilas.length)}</span></dd></div>
      <div><dt>${tip("Tokens de las fotos", "tokensfoto")}</dt><dd><span class="mono">${ent(prodTokensFoto)}</span></dd></div>
      <div><dt>Lo que agrega una foto</dt><dd><span class="mono">${usd(prodTokensFoto / prodFotos.length / 1e6)}</span></dd></div>
    </dl>
    <p class="detalle-nota"><strong>Los ${prodFilas.length} están anotados uno por uno.</strong> Las fotos se identifican por su tamaño y su peso, que es lo que decide el precio: el modelo parte la imagen en cuadritos y cobra por cuadrito, así que una captura ancha cuesta cinco veces más que una foto chica.</p>
    ${tabla("produccion", "Qué llegó", prodFilas.length, "turnos", "s")}
  </section>

  <section class="cierre">
    <div>
      <h3>Dónde está el dinero</h3>
      <p>De cada dólar, casi todo se va en lo que el modelo <strong>lee</strong>, no en lo que escribe. Sofía contesta corto, pero para contestar tiene que releer entero su guion, las tres sedes, las habitaciones, los precios, las promociones encendidas y toda la charla previa.</p>
      <p>Por eso oír cien minutos de notas de voz sale doce centavos y contestar los mensajes sale <strong>ciento setenta veces más</strong>. El día que haya que abaratar esto, se abarata del lado de la lectura, no del lado del audio.</p>
    </div>
    <div>
      <h3>Qué fue real y qué no</h3>
      <p>Real: <strong>cada consulta a los modelos</strong>, con el mismo código que atiende a los huéspedes, el guion de Sofía, sus herramientas y el inventario verdadero de las tres sedes. El precio de cada línea sale de la factura que devolvió esa consulta.</p>
      <p>No real: en la prueba de carga nada pasó por WhatsApp y a nadie le sonó el teléfono. Los mensajes salen de un repertorio que se combina y se repite, las notas de voz son grabadas y las fotos se reutilizan. Lo que se quería medir era el costo de pensar, y eso se mide pensando.</p>
    </div>
    <div>
      <h3>Cómo se repite</h3>
      <p>Desde el proyecto, con la llave de cada modelo puesta:</p>
      <p><code>scripts/carga-masiva.ts --texto 3000 --audio 100 --imagenes 100</code></p>
      <p>La prueba nunca escribe en el panel de consumo del cliente: miles de filas inventadas arruinarían sus números.</p>
    </div>
  </section>

  <p class="pie">Los totales son de la corrida completa del ${COMPLETA.fecha}. El detalle línea por línea se recuperó volviéndola a correr el 20 de agosto, y alcanzó para las 662 notas de voz enteras y 597 mensajes antes de que se acabara el saldo de la llave. Los turnos de WhatsApp son del 18 de agosto.</p>
</div>

<script>
const DATOS = ${JSON.stringify(DATOS)};
const PASO = 200;
const nf = new Intl.NumberFormat("es-ES");
const lim = (s) => String(s).replace(/[&<>]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

const anchoTip = () => Math.min(310, window.innerWidth * 0.72);
for (const q of document.querySelectorAll(".q")) {
  const ubicar = () => {
    const r = q.getBoundingClientRect();
    q.classList.toggle("al-reves", r.left + anchoTip() > window.innerWidth - 8);
  };
  q.addEventListener("pointerenter", ubicar);
  q.addEventListener("focus", ubicar);
}

for (const caja of document.querySelectorAll("[data-tabla]")) {
  const d = DATOS[caja.dataset.tabla];
  if (!d) continue;
  const cuerpo = caja.querySelector("[data-cuerpo]");
  const btnMas = caja.querySelector("[data-mas]");
  const btnTodo = caja.querySelector("[data-todo]");
  const conteo = caja.querySelector("[data-conteo]");
  const buscar = caja.querySelector("input");
  const todas = d.filas.map((f, i) => [i, f]);
  let lista = todas;
  let visibles = 0;

  const fila = ([i, f]) => {
    const p = d.max ? f[4] / d.max : 0;
    return "<tr><td class='num tenue'>" + (i + 1) + "</td>" +
      "<td class='que'>" + lim(f[0]) + "</td>" +
      "<td class='num'>" + f[1] + "</td>" +
      "<td class='num'>" + nf.format(f[2]) + "</td>" +
      "<td class='num'>" + nf.format(f[3]) + "</td>" +
      "<td class='num tenue'>" + (d.tiempo === "s" ? Math.round(f[5] / 1000) + " s" : nf.format(f[5])) + "</td>" +
      "<td class='num costo' style='--p:" + p.toFixed(3) + "'><i></i><span>$" + f[4].toFixed(6) + "</span></td></tr>";
  };

  function marcador() {
    const quedan = lista.length - visibles;
    btnMas.hidden = quedan <= 0;
    btnTodo.hidden = quedan <= PASO;
    btnMas.textContent = "Mostrar " + nf.format(Math.min(PASO, quedan)) + " más";
    conteo.textContent = nf.format(visibles) + " de " + nf.format(lista.length);
  }

  function pintar(reiniciar) {
    if (reiniciar) { cuerpo.innerHTML = ""; visibles = 0; }
    const hasta = Math.min(visibles + PASO, lista.length);
    cuerpo.insertAdjacentHTML("beforeend", lista.slice(visibles, hasta).map(fila).join(""));
    visibles = hasta;
    marcador();
  }

  btnMas.addEventListener("click", () => pintar(false));
  btnTodo.addEventListener("click", () => {
    cuerpo.innerHTML = lista.map(fila).join("");
    visibles = lista.length;
    marcador();
  });
  buscar.addEventListener("input", () => {
    const t = buscar.value.trim().toLowerCase();
    lista = t ? todas.filter(([, f]) => String(f[0]).toLowerCase().includes(t)) : todas;
    pintar(true);
  });

  pintar(true);
}
</script>
`;

fs.writeFileSync(SALIDA, html, "utf8");
console.log(
  "escrito: " + SALIDA + "  (" + (Buffer.byteLength(html) / 1024).toFixed(0) + " KB)\n" +
    "  total  " + usd(total, 2) + " sobre " + ent(unidades) + " atenciones\n" +
    "  filas  texto " + DATOS.texto.filas.length + " · audio " + DATOS.audio.filas.length + " · whatsapp " + DATOS.produccion.filas.length,
);
