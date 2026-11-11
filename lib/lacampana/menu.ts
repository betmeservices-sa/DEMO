// El menú de Restaurante La Campana, tal como está publicado en lacampanacyt.com
// (tienda en línea, noviembre de 2026). Nombres, precios y descripciones son los
// del sitio; las fotos se bajaron del mismo sitio y viven en public/fotos/lc.
//
// Es un DEMO: si cambia el menú del restaurante, este archivo se queda atrás.

export interface Plato {
  id: string;
  nombre: string;
  precio: number;
  categorias: string[];
  descripcion?: string;
  foto?: string;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export const CATEGORIAS: Categoria[] = [
  { id: "promos", nombre: "Promos" },
  { id: "desayunos-y-cenas", nombre: "Desayunos y Cenas" },
  { id: "tipicos-mexicanos", nombre: "Típicos Mexicanos" },
  { id: "especialidad-birria", nombre: "Especialidad Birria" },
  { id: "carnes", nombre: "Carnes" },
  { id: "parrilladas", nombre: "Parrilladas" },
  { id: "para-compartir", nombre: "Para Compartir" },
  { id: "con-sabor-a-mar-ensaladas", nombre: "Con sabor a mar & ensaladas" },
  { id: "hamburguesas-gourmet", nombre: "Hamburguesas Gourmet" },
  { id: "entradas", nombre: "Entradas" },
  { id: "bebidas-frias", nombre: "Bebidas frías" },
  { id: "bebidas-calientes", nombre: "Bebidas calientes" },
  { id: "postres", nombre: "Postres" },
];

export const MENU: Plato[] = [
  { id: "promo-burritos", nombre: "Promo Burritos", precio: 9.75, categorias: ["promos"], descripcion: "2 burritos con frijoles, guacamole, carne, arroz, quesillo, chimol, cilantro", foto: "/fotos/lc/promo-burritos.jpg" },
  { id: "promo-tortas", nombre: "Promo Tortas", precio: 10.00, categorias: ["promos"], descripcion: "2 tortas con frijoles, carne, guacamole, mayonesa y chimol", foto: "/fotos/lc/promo-tortas.jpg" },
  { id: "campacheros", nombre: "Campacheros", precio: 25.99, categorias: ["para-compartir", "promos"], descripcion: "Cuatro típicos mexicanos, una entrada de nachos y cuatro bebidas de 16 oz.", foto: "/fotos/lc/campacheros.jpg" },
  { id: "mi-media-campana", nombre: "Mi Media Campana", precio: 13.50, categorias: ["para-compartir", "promos"], descripcion: "Dos típicos mexicanos, una entrada de nachos y dos bebidas de 16 oz.", foto: "/fotos/lc/mi-media-campana.jpg" },
  { id: "parrillada-para-2", nombre: "Parrillada para 2", precio: 19.95, categorias: ["parrilladas", "promos"], descripcion: "Dos platos con carne y pollo, casamiento, ensalada fresca, chorizo y tortillas.", foto: "/fotos/lc/parrillada-para-2.jpg" },
  { id: "parrillada-para-4", nombre: "Parrillada para 4", precio: 33.95, categorias: ["parrilladas", "promos"], descripcion: "4 platos, cada uno con 1/2 libra total entre carne y pollo, casamiento, ensalada fresca, chorizo y 2 tortillas.", foto: "/fotos/lc/parrillada-para-4.jpg" },
  { id: "wafles", nombre: "Wafles", precio: 3.75, categorias: ["desayunos-y-cenas"], descripcion: "Dos waffles dorados y crujientes con jarabe de maple." },
  { id: "el-americano-campana", nombre: "El Americano Campana", precio: 5.75, categorias: ["desayunos-y-cenas"], descripcion: "Dos huevos estrellados con tocino crujiente y waffles dorados, acompañados de jarabe de maple para un delicioso contraste dulce." },
  { id: "muffin-desayuno", nombre: "Muffin Desayuno", precio: 3.50, categorias: ["desayunos-y-cenas"], descripcion: "Pan brioche relleno con huevo, jamón, tocino y queso americano." },
  { id: "campesino", nombre: "Campesino", precio: 6.95, categorias: ["desayunos-y-cenas"], descripcion: "Dos huevos estrellados acompañados de frijoles refritos, queso duro dorado, aguacate y nuestra tomatada casera, servidos con 1/4 lb de churrasco.", foto: "/fotos/lc/campesino.jpg" },
  { id: "omelette", nombre: "Omelette", precio: 5.95, categorias: ["desayunos-y-cenas"], descripcion: "Omelette de jamón y quesillo o vegetales y quesillo, acompañado de papa salteada, tocino y salsa de queso.", foto: "/fotos/lc/omelette.jpg" },
  { id: "sandwich-americano", nombre: "Sandwich Americano", precio: 4.95, categorias: ["desayunos-y-cenas"], descripcion: "Pan tostado relleno de jamón, huevos estrellados, frijoles refritos, guacamole y nuestra tomatada casera.", foto: "/fotos/lc/sandwich-americano.jpg" },
  { id: "el-ranchero", nombre: "El Ranchero", precio: 5.75, categorias: ["desayunos-y-cenas"], descripcion: "Dos huevos estrellados sobre tortillas, bañados en tomatada casera, acompañados de frijoles refritos, chorizo y queso duro dorado.", foto: "/fotos/lc/el-ranchero.jpg" },
  { id: "chilaquiles", nombre: "Chilaquiles", precio: 5.95, categorias: ["desayunos-y-cenas"], descripcion: "Nachos bañados en nuestra salsa criolla de la casa (con cebolla o sin cebolla), acompañados de pollo, crema y queso rallado, servidos con frijoles refritos y un huevo estrellado.", foto: "/fotos/lc/chilaquiles.jpg" },
  { id: "burrito-de-huevo-y-jamon", nombre: "Burrito de huevo y jamón", precio: 5.50, categorias: ["desayunos-y-cenas"], descripcion: "Tortilla de trigo rellena de huevo, jamón, crema y aguacate, acompañada de salsa de queso y frijoles refritos.", foto: "/fotos/lc/burrito-de-huevo-y-jamon.jpg" },
  { id: "el-tipico", nombre: "El Típico", precio: 5.50, categorias: ["desayunos-y-cenas"], descripcion: "Huevos revueltos con chile verde y cebolla (opcional), acompañados de frijoles refritos, plátanos fritos, queso duro dorado, crema y tomatada casera.", foto: "/fotos/lc/el-tipico.jpg" },
  { id: "alambre-de-pollo", nombre: "Alambre de pollo", precio: 12.50, categorias: ["tipicos-mexicanos"], descripcion: "Delicioso alambre pechuga de pollo, vegetales salteados acompañado de 7 tortillas de maíz calientes y aguacate fresco.", foto: "/fotos/lc/alambre-de-pollo.jpg" },
  { id: "sopa-de-tortilla-pequena-16-oz", nombre: "Sopa de tortilla pequeña (16 oz)", precio: 4.25, categorias: ["tipicos-mexicanos"], descripcion: "Caldo de tortilla acompañado con nachos, quesillo, aguacate, crema y cilantro.", foto: "/fotos/lc/sopa-de-tortilla-pequena-16-oz.jpg" },
  { id: "sopa-de-tortilla-grande-32-oz", nombre: "Sopa de tortilla grande (32 oz)", precio: 6.50, categorias: ["tipicos-mexicanos"], descripcion: "Caldo de tortilla acompañado con nachos, quesillo, aguacate, crema y cilantro.", foto: "/fotos/lc/sopa-de-tortilla-grande-32-oz.jpg" },
  { id: "alambre-de-res", nombre: "Alambre de res", precio: 12.50, categorias: ["tipicos-mexicanos"], descripcion: "Delicioso alambre con carne corte churrasco, vegetales salteados acompañado de 7 tortillas de maíz calientes y aguacate fresco.", foto: "/fotos/lc/alambre-de-res.jpg" },
  { id: "torta-mexicana", nombre: "Torta Mexicana", precio: 6.95, categorias: ["tipicos-mexicanos"], descripcion: "Torta con frijoles, carne, guacamole, mayonesa y chimol.", foto: "/fotos/lc/torta-mexicana.jpg" },
  { id: "torta-cubana", nombre: "Torta Cubana", precio: 6.95, categorias: ["tipicos-mexicanos"], descripcion: "Torta con jamón, quesillo, frijoles, mayonesa y chimol.", foto: "/fotos/lc/torta-cubana.jpg" },
  { id: "tacos-rancheros", nombre: "Tacos Rancheros", precio: 6.95, categorias: ["tipicos-mexicanos"], descripcion: "Tres tacos de doble tortilla de maíz con frijoles, guacamole, chimol, cebolla y cilantro.", foto: "/fotos/lc/tacos-rancheros.jpg" },
  { id: "quesadillas-mexicanas", nombre: "Quesadillas Mexicanas", precio: 6.95, categorias: ["tipicos-mexicanos"], descripcion: "Cuatro tortillas de harina con quesillo, carne, frijoles y chimol.", foto: "/fotos/lc/quesadillas-mexicanas.jpg" },
  { id: "nachos-campana", nombre: "Nachos Campana", precio: 7.25, categorias: ["tipicos-mexicanos"], descripcion: "Nachos de maíz con frijoles, quesillo, guacamole, chimol, trozos de carne y queso rallado.", foto: "/fotos/lc/nachos-campana.jpg" },
  { id: "enchiladas", nombre: "Enchiladas", precio: 6.95, categorias: ["tipicos-mexicanos"], descripcion: "Tres tostadas con frijoles, carne, lechuga, chimol, aguacate y queso rallado.", foto: "/fotos/lc/enchiladas.jpg" },
  { id: "nachos-jalapenos", nombre: "Nachos Jalapeños", precio: 7.25, categorias: ["tipicos-mexicanos"], descripcion: "Nachos de maíz con carne a elección, frijoles, quesillo, guacamole, trozos de carne, jalapeños, crema y queso rallado.", foto: "/fotos/lc/nachos-jalapenos.jpg" },
  { id: "tacos-mexicanos", nombre: "Tacos Mexicanos", precio: 6.95, categorias: ["tipicos-mexicanos"], descripcion: "Cuatro tacos de doble tortilla de maíz con chimol, cebolla y cilantro.", foto: "/fotos/lc/tacos-mexicanos.jpg" },
  { id: "burrito", nombre: "Burrito", precio: 6.95, categorias: ["tipicos-mexicanos"], descripcion: "Burrito con frijoles, guacamole, carne, arroz, quesillo, chimol y cilantro.", foto: "/fotos/lc/burrito.jpg" },
  { id: "torta-de-birria", nombre: "Torta de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Torta con carne de birria, frijoles, guacamole, mayonesa y chimol.", foto: "/fotos/lc/torta-de-birria.jpg" },
  { id: "quesadillas-de-birria", nombre: "Quesadillas de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Cuatro tortillas de harina con carne de birria, quesillo, frijoles y chimol.", foto: "/fotos/lc/quesadillas-de-birria.jpg" },
  { id: "enchiladas-de-birria", nombre: "Enchiladas de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Tres tostadas con carne de birria, frijoles, lechuga, chimol, aguacate y queso rallado." },
  { id: "tacos-rancheros-de-birria", nombre: "Tacos rancheros de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Tres tacos de birria con frijoles, guacamole y chimol." },
  { id: "tacos-de-birria", nombre: "Tacos de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Cuatro tacos de birria acompañados de su caldo.", foto: "/fotos/lc/tacos-de-birria.jpg" },
  { id: "burrito-de-birria", nombre: "Burrito de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Burrito con carne de birria, frijoles, guacamole, arroz, quesillo, chimol y cilantro.", foto: "/fotos/lc/burrito-de-birria.jpg" },
  { id: "nachos-jalapenos-de-birria", nombre: "Nachos jalapeños de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Nachos con carne de birria, frijoles, quesillo, guacamole, chile jalapeño y queso rallado." },
  { id: "nachos-campana-de-birria", nombre: "Nachos Campana de birria", precio: 9.45, categorias: ["especialidad-birria"], descripcion: "Nachos con carne de birria, frijoles, guacamole, quesillo, chimol y queso rallado." },
  { id: "mar-y-tierra", nombre: "Mar y Tierra", precio: 16.95, categorias: ["carnes"], descripcion: "Jugosos camarones al ajillo acompañados de un tierno filete de carne a la parrilla, servidos con puré de papas cremoso y vegetales frescos a la parrilla. Incluye pan con ajo o tortillas fritas a elección." },
  { id: "costilla-de-cerdo", nombre: "Costilla de cerdo", precio: 9.95, categorias: ["carnes"], descripcion: "Jugosa costilla de cerdo bañada en salsa BBQ o a la plancha (1/2 lb), acompañada de chimol, escabeche y papa al gusto.", foto: "/fotos/lc/costilla-de-cerdo.jpg" },
  { id: "puyazo-importado", nombre: "Puyazo Importado", precio: 11.50, categorias: ["carnes"], descripcion: "Jugoso puyazo importado a la parrilla, acompañado de chimol y vinagreta de la casa, con papa al gusto.", foto: "/fotos/lc/puyazo-importado.jpg" },
  { id: "carne-campesina", nombre: "Carne Campesina", precio: 11.95, categorias: ["carnes"], descripcion: "Jugoso corte a la parrilla a elección, acompañado de chorizo, arroz, frijoles y papa al gusto.", foto: "/fotos/lc/carne-campesina.jpg" },
  { id: "pechuga-de-pollo", nombre: "Pechuga de pollo", precio: 9.95, categorias: ["carnes"], descripcion: "Jugosa pechuga de pollo a la parrilla o empanizada (1/2 lb), acompañada de ensalada fresca, aderezo, guacamole y papa al gusto.", foto: "/fotos/lc/pechuga-de-pollo.jpg" },
  { id: "lomo-de-aguja", nombre: "Lomo de aguja", precio: 14.95, categorias: ["carnes"], descripcion: "Jugoso lomo de aguja a la parrilla (1/2 lb), acompañado de casamiento, guacamole, chimol y salsa jalapeña.", foto: "/fotos/lc/lomo-de-aguja.jpg" },
  { id: "chicharrones", nombre: "Chicharrones", precio: 9.95, categorias: ["carnes"], descripcion: "Deliciosos chicharrones (1/2 lb), acompañados de frijoles, guacamole, chimol y escabeche.", foto: "/fotos/lc/chicharrones.jpg" },
  { id: "churrasco-campana", nombre: "Churrasco Campana", precio: 12.95, categorias: ["carnes"], descripcion: "Delicioso corte a la parrilla a elección, acompañado de chorizo, casamiento, guacamole, chimol y queso dorado.", foto: "/fotos/lc/churrasco-campana.jpg" },
  { id: "carne-campana", nombre: "Carne Campana", precio: 11.50, categorias: ["carnes"], descripcion: "Delicioso corte a la parrilla a elección, acompañado de chimol y frijoles, servido con tortillas de harina con quesillo derretido.", foto: "/fotos/lc/carne-campana.jpg" },
  { id: "carne-tipica-campana", nombre: "Carne Típica Campana", precio: 11.50, categorias: ["carnes"], descripcion: "Delicioso corte a la parrilla a elección, acompañado de frijoles, plátano, queso dorado y chimol.", foto: "/fotos/lc/carne-tipica-campana.jpg" },
  { id: "bandeja-marinera", nombre: "Bandeja Marinera", precio: 29.95, categorias: ["parrilladas"], descripcion: "Pescado y camarones crujientes, acompañados de papas fritas, guacamole, pan con ajo, aderezos chipotle y mil islas. Incluye chile poppers." },
  { id: "parrillada-mar-y-tierra", nombre: "Parrillada Mar y Tierra", precio: 37.95, categorias: ["parrilladas"], descripcion: "Carne a la parrilla, pechuga de pollo, camarones, lonja empanizada, chorizo, vegetales, arroz, queso dorado y tortillas." },
  { id: "parrillada-de-campeones", nombre: "Parrillada de Campeones", precio: 48.95, categorias: ["parrilladas"], descripcion: "Jugosa carne de res a la parrilla, pechuga, costilla de cerdo, chicharrón y chorizos, acompañados de guacamole, frijoles, chimol, limón y tortillas a elección. Incluye papas francesas para compartir." },
  { id: "quesobirria", nombre: "Quesobirria", precio: 30.95, categorias: ["para-compartir"], descripcion: "Tortillas doradas con birria, carne, queso derretido, chimol, frijoles y guacamole." },
  { id: "taquiza-de-birria", nombre: "Taquiza de birria", precio: 27.95, categorias: ["para-compartir"], descripcion: "Dieciséis tacos de birria con chimol, frijoles, guacamole y caldo de birria." },
  { id: "taquiza", nombre: "Taquiza", precio: 20.95, categorias: ["para-compartir"], descripcion: "Dieciséis tacos con chimol, guacamole y frijoles.", foto: "/fotos/lc/taquiza.jpg" },
  { id: "ensalada-de-camarones-empanizados", nombre: "Ensalada de camarones empanizados", precio: 9.45, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Deliciosos camarones empanizados, crujientes por fuera y jugosos por dentro, servidos sobre una fresca base de lechuga, acompañados de tomate, pepino, mix primavera y aguacate." },
  { id: "camarones-empanizados", nombre: "Camarones empanizados", precio: 10.95, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Camarones empanizados crujientes, acompañados de papas fritas, guacamole y aderezo chipotle." },
  { id: "hamburguesa-de-camaron", nombre: "Hamburguesa de camarón", precio: 9.95, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Crujientes camarones empanizados con queso americano derretido, en pan brioche suave con guacamole, lechuga fresca y tomate." },
  { id: "tacos-de-camaron", nombre: "Tacos de camarón", precio: 9.50, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Cuatro tacos de camarón en doble tortilla, con lechuga fresca, aguacate y aderezo a elección: chipotle o mil islas." },
  { id: "ensalada-de-lonja-de-pescado", nombre: "Ensalada de lonja de pescado", precio: 8.95, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Crujientes trocitos de lonja de pescado empanizada, servidos sobre una fresca base de lechuga, acompañada de tomate, pepino, mix primavera y aguacate.", foto: "/fotos/lc/ensalada-de-lonja-de-pescado.jpg" },
  { id: "lonja-de-pescado-empanizada", nombre: "Lonja de pescado empanizada", precio: 9.95, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Crujiente lonja de pescado empanizada, acompañada de arroz y papa, servida con chimol.", foto: "/fotos/lc/lonja-de-pescado-empanizada.jpg" },
  { id: "tacos-de-pescado-empanizados", nombre: "Tacos de pescado empanizados", precio: 9.45, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Tortillas de maíz rellenas de crujientes trocitos de lonja de pescado empanizado, acompañadas de lechuga fresca, aguacate y aderezo.", foto: "/fotos/lc/tacos-de-pescado-empanizados.jpg" },
  { id: "ensalada-de-pollo", nombre: "Ensalada de pollo", precio: 8.50, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Fajitas de pechuga de pollo a la parrilla, jugosas y bien sazonadas, servidas sobre una fresca base de lechuga, acompañadas de tomate, pepino, mix primavera y aguacate. Se complementa con crotones dorados y aderezo, logrando una opción ligera, balanceada y llena de sabor.", foto: "/fotos/lc/ensalada-de-pollo.jpg" },
  { id: "ensalada-de-carne", nombre: "Ensalada de carne", precio: 8.95, categorias: ["con-sabor-a-mar-ensaladas"], descripcion: "Fajitas de jugoso churrasco a la parrilla, servidas sobre una fresca base de lechuga, acompañadas de tomate, pepino, mix primavera y aguacate. Se complementa con crotones dorados y un toque especial de piña salteada, logrando una combinación equilibrada entre frescura, dulzura y sabor a la parrilla.", foto: "/fotos/lc/ensalada-de-carne.jpg" },
  { id: "hamburguesa-la-mexicana", nombre: "Hamburguesa La Mexicana", precio: 7.95, categorias: ["hamburguesas-gourmet"], descripcion: "Carne de res, queso americano, guacamole, chipotle y tiras de tortilla doradas, con papas francesas." },
  { id: "hamburguesa-la-texana", nombre: "Hamburguesa La Texana", precio: 7.95, categorias: ["hamburguesas-gourmet"], descripcion: "Carne de res, queso americano, tocino, cebolla salteada y salsa BBQ, con papas francesas." },
  { id: "hamburguesa-clasica-de-pollo", nombre: "Hamburguesa clásica de pollo", precio: 6.95, categorias: ["hamburguesas-gourmet"], descripcion: "Pechuga de pollo a la parrilla o empanizada, queso americano, mayonesa, lechuga y tomate, con papas francesas." },
  { id: "hamburguesa-clasica-a-la-parrilla", nombre: "Hamburguesa clásica a la parrilla", precio: 6.95, categorias: ["hamburguesas-gourmet"], descripcion: "Pan brioche, carne de res, queso americano, mayonesa, lechuga y tomate, con papas francesas." },
  { id: "torta-de-lomo-de-aguja", nombre: "Torta de lomo de aguja", precio: 8.99, categorias: ["hamburguesas-gourmet"], descripcion: "Torta con lomo de aguja frijoles, guacamole, mayonesa y chimol", foto: "/fotos/lc/torta-de-lomo-de-aguja.jpg" },
  { id: "chifrimol", nombre: "Chifrimol", precio: 5.50, categorias: ["entradas"], descripcion: "Deliciosa combinación de guacamole y frijoles, acompañada de chicharrón, cebolla y cilantro, servida con nachos crujientes." },
  { id: "chiles-popper-con-tocino", nombre: "Chiles popper con tocino", precio: 3.95, categorias: ["entradas"], descripcion: "Deliciosos chiles jalapeños rellenos de quesillo, asados a la parrilla y envueltos en tocino, preparados al momento." },
  { id: "entrada-de-nachos-campana", nombre: "Entrada de nachos Campana", precio: 3.95, categorias: ["entradas"], descripcion: "Crujientes nachos con frijoles, quesillo derretido, guacamole, chimol y carne, acompañados de nuestras salsas especiales.", foto: "/fotos/lc/entrada-de-nachos-campana.jpg" },
  { id: "entrada-de-sopa-de-tortilla", nombre: "Entrada de sopa de tortilla", precio: 2.50, categorias: ["entradas"], descripcion: "Sopa de tortilla servida con nachos crujientes, quesillo, aguacate, crema y cilantro.", foto: "/fotos/lc/entrada-de-sopa-de-tortilla.jpg" },
  { id: "entrada-de-nachos-jalapeno", nombre: "Entrada de nachos jalapeño", precio: 3.95, categorias: ["entradas"], descripcion: "Nachos con guacamole, frijoles, quesillo, carne, jalapeños y queso rallado.", foto: "/fotos/lc/entrada-de-nachos-jalapeno.jpg" },
  { id: "entrada-tipica", nombre: "Entrada típica", precio: 4.95, categorias: ["entradas"], descripcion: "Frijoles, guacamole fresco, chimol, queso y chorizo, acompañados de tortillas.", foto: "/fotos/lc/entrada-tipica.jpg" },
  { id: "sandwich-de-pollo", nombre: "Sándwich de pollo", precio: 4.50, categorias: ["entradas"], descripcion: "Pan suave con pollo sazonado, lechuga fresca, zanahoria rallada, mayonesa y aderezo.", foto: "/fotos/lc/sandwich-de-pollo.jpg" },
  { id: "entrada-orden-de-papas", nombre: "Entrada orden de papas", precio: 3.50, categorias: ["entradas"], descripcion: "Papas fritas crujientes servidas con kétchup.", foto: "/fotos/lc/entrada-orden-de-papas.jpg" },
  { id: "cerveza-michelob-ultra", nombre: "Cerveza Michelob Ultra", precio: 2.95, categorias: ["bebidas-frias"] },
  { id: "agua-mineral", nombre: "Agua mineral", precio: 1.55, categorias: ["bebidas-frias"] },
  { id: "mix-de-michelada", nombre: "Mix de michelada", precio: 1.25, categorias: ["bebidas-frias"] },
  { id: "cerveza-corona-330-ml", nombre: "Cerveza Corona 330 ml", precio: 2.95, categorias: ["bebidas-frias"], foto: "/fotos/lc/cerveza-corona-330-ml.jpg" },
  { id: "te-de-limon-de-32-oz", nombre: "Té de limón de 32 oz", precio: 2.25, categorias: ["bebidas-frias"] },
  { id: "te-de-limon-de-21-oz", nombre: "Té de limón de 21 oz", precio: 1.85, categorias: ["bebidas-frias"], foto: "/fotos/lc/te-de-limon-de-21-oz.jpg" },
  { id: "agua-1-2-litro", nombre: "Agua 1/2 litro", precio: 1.30, categorias: ["bebidas-frias"], foto: "/fotos/lc/agua-1-2-litro.jpg" },
  { id: "soda-lata", nombre: "Soda lata", precio: 1.55, categorias: ["bebidas-frias"], foto: "/fotos/lc/soda-lata.jpg" },
  { id: "jugo-de-naranja-de-32-oz", nombre: "Jugo de naranja de 32 oz", precio: 2.25, categorias: ["bebidas-frias"] },
  { id: "agua-litro", nombre: "Agua litro", precio: 1.65, categorias: ["bebidas-frias"], foto: "/fotos/lc/agua-litro.jpg" },
  { id: "tamarindo-de-21-oz", nombre: "Tamarindo de 21 oz", precio: 1.85, categorias: ["bebidas-frias"] },
  { id: "tamarindo-de-32-oz", nombre: "Tamarindo de 32 oz", precio: 2.25, categorias: ["bebidas-frias"] },
  { id: "jugo-de-naranja-de-21-oz", nombre: "Jugo de naranja de 21 oz", precio: 1.85, categorias: ["bebidas-frias"] },
  { id: "jamaica-de-21-oz", nombre: "Jamaica de 21 oz", precio: 1.85, categorias: ["bebidas-frias"], foto: "/fotos/lc/jamaica-de-21-oz.jpg" },
  { id: "horchata-de-32-oz", nombre: "Horchata de 32 oz", precio: 2.25, categorias: ["bebidas-frias"] },
  { id: "horchata-de-21-oz", nombre: "Horchata de 21 oz", precio: 1.85, categorias: ["bebidas-frias"], foto: "/fotos/lc/horchata-de-21-oz.jpg" },
  { id: "jamaica-de-32-oz", nombre: "Jamaica de 32 oz", precio: 2.25, categorias: ["bebidas-frias"] },
  { id: "extra-de-leche", nombre: "Extra de leche", precio: 0.60, categorias: ["bebidas-calientes"] },
  { id: "vaso-de-leche-tibia", nombre: "Vaso de leche tibia", precio: 1.75, categorias: ["bebidas-calientes"] },
  { id: "capuchino-8-oz", nombre: "Capuchino 8 oz", precio: 2.95, categorias: ["bebidas-calientes"] },
  { id: "cafe-8-oz", nombre: "Café 8 oz", precio: 1.50, categorias: ["bebidas-calientes"] },
  { id: "te-de-manzanilla", nombre: "Té de manzanilla", precio: 1.50, categorias: ["bebidas-calientes"] },
  { id: "quesadilla", nombre: "Quesadilla", precio: 1.95, categorias: ["postres"] },
  { id: "budin", nombre: "Budín", precio: 1.95, categorias: ["postres"] },
  { id: "hojuelas-cafe-8-oz", nombre: "Hojuelas + café 8 oz", precio: 1.50, categorias: ["postres"] },
  { id: "2-cheesecakes-2-cafes-8-oz", nombre: "2 cheesecakes + 2 cafés 8 oz", precio: 6.00, categorias: ["postres"] },
  { id: "cheesecake-cafe-8-oz", nombre: "Cheesecake + café 8 oz", precio: 3.95, categorias: ["postres"], foto: "/fotos/lc/cheesecake-cafe-8-oz.jpg" },
  { id: "cheesecake", nombre: "Cheesecake", precio: 3.25, categorias: ["postres"] },
  { id: "budin-cafe-8-oz", nombre: "Budín + café 8 oz", precio: 2.75, categorias: ["postres"], foto: "/fotos/lc/budin-cafe-8-oz.jpg" },
  { id: "quesadilla-cafe-8-oz", nombre: "Quesadilla + café 8 oz", precio: 2.75, categorias: ["postres"], foto: "/fotos/lc/quesadilla-cafe-8-oz.jpg" },
  { id: "hojuelas-azucaradas", nombre: "Hojuelas azucaradas", precio: 0.75, categorias: ["postres"], foto: "/fotos/lc/hojuelas-azucaradas.jpg" },
];

export function platosDe(categoriaId: string): Plato[] {
  return MENU.filter((p) => p.categorias.includes(categoriaId));
}

export function platoPorId(id: string): Plato | undefined {
  return MENU.find((p) => p.id === id);
}

export function precio(n: number): string {
  return "$" + n.toFixed(2);
}
