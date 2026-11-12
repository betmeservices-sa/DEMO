// PRECIOS OFICIALES del laboratorio: la lista "precios - IA Valeria" (Excel que
// mandó el lab el 2026-11-12). MANDA sobre los precios sacados de los chats y del
// Word: el usuario reportó que Valeria seguía dando precios mal (insulina $49.86
// en vez de $48, HDL/VLDL/prolactina "sin confirmar"). Generado desde el Excel;
// para cambiar un precio se cambia el Excel y se vuelve a generar.
//
// - PRECIOS_EXCEL: por id de la base, lo que el Excel dice de ese examen.
// - EXAMENES_EXCEL: los del Excel que la base no tenía.
// Duplicados en el Excel: vale la ÚLTIMA aparición (la lista de abajo es la vigente).

import type { ExamenKb } from "./lab-kb";

export interface PrecioExcel {
  precio?: number;
  precioAseguradora?: number;
  resultado?: string;
  /** La "indicación previa" del Excel; sin ella, el examen no pide preparación. */
  indicacion?: string;
  /** Cómo se llama en el Excel (código - nombre). */
  excel: string;
}

export const PRECIOS_EXCEL: Record<string, PrecioExcel> = {
  "lab-hemograma": {
    "precio": 6,
    "precioAseguradora": 5.73,
    "resultado": "Unas 3 horas.",
    "excel": "01004 - RECUENTO DE PLAQUETAS"
  },
  "lab-frotis": {
    "precio": 24.1,
    "precioAseguradora": 22.89,
    "resultado": "De 3 a 5 días hábiles.  Es realizado por médico hematologo)",
    "indicacion": "Los resultados de los frotis tardan entre 3 y 5 días hábiles en estar listos (no se incluyen los fines de semana). Esto se debe a que nuestro hematólogo, quien lee los frotis, nos visita solamente dos veces por semana. No obstante, si el resultado está disponible antes, con gusto se lo proporcionaremos.",
    "excel": "01006 - FROTIS DE SANGRE PERIFERICA HEMATOLOGA"
  },
  "lab-eritrosedimentacion": {
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "resultado": "Unas 3 horas.",
    "excel": "01007 - ERITROSEDIMENTACION (SEOMEGTACION) (VSG)"
  },
  "lab-tp-tpt": {
    "precio": 8.8,
    "precioAseguradora": 8.34,
    "resultado": "Unas 3 horas.",
    "excel": "01015 - TIEMPO TROMBOPLASTINA PARCIAL (TTP)"
  },
  "lab-grupo-rh": {
    "precio": 8.2,
    "precioAseguradora": 7.77,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ningua",
    "excel": "02001 - GRUPO SANGUINEO Y RH"
  },
  "lab-coombs-indirecto": {
    "precio": 8.7,
    "precioAseguradora": 8.27,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ningua",
    "excel": "02004 - COOMBS INDIRECTO"
  },
  "lab-glucosa": {
    "precio": 7,
    "precioAseguradora": 6.11,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ayuno mínimo de 8h a un máximo de 12h o según indicación medica",
    "excel": "03001 - GLUCOSA EN SANGRE"
  },
  "lab-glucosa-postprandial": {
    "precio": 6.4,
    "precioAseguradora": 6.11,
    "resultado": "Desde la ultima toma De 3 horas",
    "indicacion": "El paciente debe de venir en ayuno de 8 horas minimo y 10 horas maximo. Le tomaran las muestras en ayuno, luego la mandan a desayunar y desde el primer bocado debe de comenzar a contar 2 horas, unos minutos antes debe de estar nuevamente en el laboratorio y a las 2 horas le tomaran la muestra para la Glucosa Post prandial.",
    "excel": "03002 - GLUCOSA POST-PRANDIAL (2 HORAS)"
  },
  "lab-hba1c": {
    "precio": 40.1,
    "precioAseguradora": 38.11,
    "resultado": "Unas 3 horas.",
    "excel": "03007 - HEMOGLOBINA A1C"
  },
  "lab-osullivan": {
    "precio": 15.4,
    "precioAseguradora": 14.66,
    "resultado": "Unas 3 horas.",
    "indicacion": "La paciente debe de permanecer en el laboratorio 1 hora posterior a la toma de prudex",
    "excel": "03008 - TEST DE O'SULLIVAN"
  },
  "lab-nitrogeno-ureico": {
    "precio": 7.6,
    "precioAseguradora": 7.22,
    "resultado": "Unas 3 horas.",
    "excel": "03009 - NITROGENO UREICO (BUN)"
  },
  "lab-creatinina": {
    "precio": 9,
    "precioAseguradora": 7.22,
    "resultado": "Unas 3 horas.",
    "excel": "03010 - CREATININA EN SANGRE"
  },
  "lab-depuracion-creatinina": {
    "precio": 18.7,
    "precioAseguradora": 17.78,
    "resultado": "Unas 3 horas.",
    "indicacion": "Para poder recolectar esta muestra, la primera orina debe desecharla. A partir de la segunda micción, debe recolectar toda la orina durante 24 horas. Puede utilizar un recipiente grande, como una garrafa de galón de agua, por ejemplo, el galón de agua Alpina",
    "excel": "03011 - DEPURACION DE CREATININA. ORINA EN 24 H. MUJER"
  },
  "lab-trigliceridos": {
    "precio": 11.5,
    "precioAseguradora": 10.57,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ayuno de 8 a 14h o según indicación medica",
    "excel": "03012 - TRIGLICERIDOS"
  },
  "lab-colesterol": {
    "precio": 9,
    "precioAseguradora": 7.5,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ayuno máximo de 8h a un máximo de 12h o según indicación medica",
    "excel": "03013 - COLESTEROL TOTAL"
  },
  "lab-hdl": {
    "precio": 14.7,
    "precioAseguradora": 14,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ayuno mínimo de 8h a un máximo de 12h o según indicación medica",
    "excel": "03014 - COLESTEROL ALTA DENSIDAD ( H.D.L ) (baja densidad)"
  },
  "lab-ldl": {
    "precio": 14.7,
    "precioAseguradora": 14,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ayuno mínimo de 8h a un máximo de 12h o según indicación medica",
    "excel": "03015 - COLESTEROL BAJA DENSIDAD ( L.D.L ) (alta densidad)"
  },
  "lab-proteinas-totales": {
    "precio": 8.7,
    "precioAseguradora": 8.27,
    "resultado": "Unas 3 horas.",
    "excel": "03017 - PROTEINA SERICA Y RELACION A/G"
  },
  "lab-acido-urico": {
    "precio": 7.6,
    "precioAseguradora": 7.22,
    "resultado": "Unas 3 horas.",
    "excel": "03018 - ACIDO URICO EN SANGRE"
  },
  "lab-sodio": {
    "precio": 6.7,
    "precioAseguradora": 6.39,
    "resultado": "Unas 3 horas.",
    "excel": "03019 - SODIO EN SANGRE"
  },
  "lab-potasio": {
    "precio": 7.4,
    "precioAseguradora": 7.01,
    "resultado": "Unas 3 horas.",
    "excel": "03021 - POTASIO EN SANGRE"
  },
  "lab-calcio": {
    "precio": 8.7,
    "precioAseguradora": 8.27,
    "resultado": "Unas 3 horas.",
    "excel": "03023 - CALCIO EN SANGRE"
  },
  "lab-fosforo": {
    "precio": 6.7,
    "precioAseguradora": 6.39,
    "resultado": "Unas 3 horas.",
    "excel": "03024 - FOSFORO EN SANGRE"
  },
  "lab-magnesio": {
    "precio": 13.4,
    "precioAseguradora": 12.72,
    "resultado": "Unas 3 horas.",
    "excel": "03025 - MAGNESIO EN SANGRE"
  },
  "lab-bilirrubina": {
    "precio": 8.7,
    "precioAseguradora": 8.27,
    "resultado": "Unas 3 horas.",
    "excel": "03026 - BILIRRUBINA DIFERENCIAL (Bb.:T.D.I.)"
  },
  "lab-hierro": {
    "precio": 12.8,
    "precioAseguradora": 12.12,
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "excel": "03027 - HIERRO TOTAL"
  },
  "lab-ferritina": {
    "precio": 46.8,
    "precioAseguradora": 44.44,
    "resultado": "Unas 3 horas.",
    "excel": "03029 - FERRITINA"
  },
  "lab-transferrina": {
    "precio": 44.5,
    "precioAseguradora": 42.22,
    "resultado": "Unas 3 horas.",
    "excel": "03030 - TRANSFERRINA"
  },
  "lab-proteinas-orina-24h": {
    "precio": 16.1,
    "precioAseguradora": 15.28,
    "resultado": "Unas 3 horas.",
    "excel": "PROTEINA EN ORINA DE 24 HORAS"
  },
  "lab-vitamina-d": {
    "precio": 93.6,
    "precioAseguradora": 88.89,
    "resultado": "Unas 3 horas.",
    "excel": "03035 - NIVELES DE VITAMINA D"
  },
  "lab-fosfatasa-alcalina": {
    "precio": 10,
    "precioAseguradora": 9.55,
    "resultado": "Unas 3 horas.",
    "excel": "04003 - FOSFATASA ALCALINA"
  },
  "lab-amilasa": {
    "precio": 12.8,
    "precioAseguradora": 12.12,
    "resultado": "Unas 3 horas.",
    "excel": "04004 - AMILASA EN SANGRE"
  },
  "lab-lipasa": {
    "precio": 19.4,
    "precioAseguradora": 18.44,
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "excel": "04005 - LIPASA"
  },
  "lab-ggt": {
    "precio": 15.4,
    "precioAseguradora": 14.61,
    "resultado": "Unas 3 horas.",
    "excel": "04006 - GAMMA GLUTAMIL TRANSFERRASA (GGT)"
  },
  "lab-cpk": {
    "precio": 31.5,
    "precioAseguradora": 29.89,
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "excel": "04008 - CREATINO FOSFOQUINASA TOTAL ( CPK )"
  },
  "lab-antigenos-febriles": {
    "precio": 9.4,
    "precioAseguradora": 8.89,
    "resultado": "Unas 3 horas.",
    "excel": "05001 - ANTIGENOS FEBRILES"
  },
  "lab-bhcg": {
    "precio": 46.8,
    "precioAseguradora": 44.44,
    "resultado": "Unas 3 horas.",
    "excel": "05002 - GONADOTROPINA CORIONICA CUANTIT.(BHCG)"
  },
  "lab-monotest": {
    "precio": 9.4,
    "precioAseguradora": 8.89,
    "resultado": "Unas 3 horas.",
    "excel": "MONOTEST(MONONUCLEOSIS)  AC.HETEROFILO"
  },
  "lab-latex-ra": {
    "precio": 12.1,
    "precioAseguradora": 11.45,
    "resultado": "Unas 3 horas.",
    "excel": "05006 - PRUEBA DE LATEX L.E."
  },
  "lab-pcr": {
    "precio": 13.5,
    "precioAseguradora": 9.99,
    "resultado": "Unas 3 horas.",
    "excel": "05007 - PROTEINA C. REACTIVA (P.C.R)"
  },
  "lab-embarazo-sangre": {
    "precio": 20.1,
    "precioAseguradora": 19.06,
    "resultado": "Unas 3 horas.",
    "excel": "05008 - PRUEBA DE EMBARAZO EN SANGRE"
  },
  "lab-ana": {
    "precio": 57.5,
    "precioAseguradora": 54.62,
    "resultado": "Unas 3 horas.",
    "excel": "05009 - ANTICUERPOS ANTINUCLEARES (ANA)"
  },
  "lab-anticardiolipina": {
    "precio": 100.3,
    "precioAseguradora": 95.27,
    "resultado": "Unas 3 horas.",
    "excel": "05010 - ANTICARDIOLIPINA IgG"
  },
  "lab-espermograma": {
    "precio": 25,
    "precioAseguradora": 16.67,
    "resultado": "De 5 a 8 horas",
    "indicacion": "El paciente debe de presentarse con abstinencia sexual y de masturbaciones mínimo de 3 días a un máximo de 5 días",
    "excel": "05019 - ESPERMOGRAMA"
  },
  "lab-insulina": {
    "precio": 48,
    "precioAseguradora": 44.45,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ayuno mínimo de 8h a un máximo de 12h o según indicación medica",
    "excel": "06001 - INSULINA EN AYUNO"
  },
  "lab-t3-libre": {
    "precio": 21.1,
    "precioAseguradora": 20,
    "resultado": "Unas 3 horas.",
    "excel": "06003 - T3- LIBRE"
  },
  "lab-tsh": {
    "precio": 35,
    "precioAseguradora": 33.34,
    "resultado": "Unas 3 horas.",
    "excel": "06006 - TSH 3ra. GENERACION (ULTRASENSITIVA)"
  },
  "lab-fsh": {
    "precio": 53.8,
    "precioAseguradora": 51.11,
    "resultado": "Unas 3 horas.",
    "excel": "06007 - HORMONA FOLICULO ESTIMULANTE (FSH)"
  },
  "lab-lh": {
    "precio": 56.1,
    "precioAseguradora": 53.33,
    "resultado": "Unas 3 horas.",
    "excel": "06008 - HORMONA LUTEINIZANTE (LH)"
  },
  "lab-prolactina": {
    "precio": 46.8,
    "precioAseguradora": 44.44,
    "resultado": "Unas 3 horas.",
    "excel": "06009 - PROLACTINA"
  },
  "lab-insulina-postprandial": {
    "precio": 48,
    "precioAseguradora": 44.45,
    "resultado": "Desde la ultima toma de muestra: 3 horas",
    "indicacion": "El paciente debe de venir en ayuno de 8 horas minimo y 10 horas maximo. Le tomaran las muestras en ayuno, luego la mandan a desayunar y desde el primer bocado debe de comenzar a contar 2 horas, unos minutos antes debe de estar nuevamente en el laboratorio y a las 2 horas le tomaran la muestra para la Insulina Post prandial.",
    "excel": "06010 - INSULINA POST-PRANDIAL"
  },
  "lab-vph": {
    "precio": 90,
    "precioAseguradora": 100,
    "resultado": "De 5 a 8 Dias",
    "indicacion": "*La muestra debe ser tomada por el médico de cabecera. *No realizar lavados vaginales. *No utilizar tampones. *No usar medicamentos vaginales durante al menos 48 horas previas. *Mantener abstinencia sexual durante los 3 días anteriores a la toma",
    "excel": "07001 - VIRUS DEL PAPILOMA HUMANO"
  },
  "lab-estreptococo-b": {
    "precio": 115.8,
    "precioAseguradora": 110,
    "resultado": "1 a 2 días",
    "indicacion": "*La muestra debe ser tomada por el médico de cabecera. *No realizar lavados vaginales. *No utilizar tampones. *No usar medicamentos vaginales durante al menos 48 horas previas. *Mantener abstinencia sexual durante los 3 días anteriores a la toma",
    "excel": "07004 - STREPTOCOCUS DEL GRUPO B (GBS)"
  },
  "lab-brca": {
    "precio": 2475,
    "precioAseguradora": 2750,
    "resultado": "3 a 5 semanas",
    "indicacion": "Ninguna o según indicacion medica",
    "excel": "07006 - BRCA 1, 2 Y TP53"
  },
  "lab-cariotipo": {
    "precio": 631.5,
    "resultado": "3 a 5 semanas",
    "indicacion": "Ninguna o según indicacion medica",
    "excel": "07012 - CARIOTIPO"
  },
  "lab-antimulleriana": {
    "precio": 90,
    "precioAseguradora": 83.33,
    "resultado": "Unas 3 horas.",
    "indicacion": "Ninguna o según indicacion medica",
    "excel": "07013 - HORMONA ANTIMULLERIANA"
  },
  "lab-psa": {
    "precio": 59.6,
    "precioAseguradora": 56.66,
    "resultado": "Unas 3 horas.",
    "indicacion": "Para la prueba del PSA 24 horas previas a la prueba: - Evitar ejercicios rigurosos. - Evitar relaciones sexuales. - Evitar masturbaciones. - Evitar consumo de bebidas alcohólicas",
    "excel": "08001 - ANTIGENO PROSTATICO ESPECIFICO TOTAL(PSA)"
  },
  "lab-ca199": {
    "precio": 81.9,
    "precioAseguradora": 77.78,
    "resultado": "Unas 3 horas.",
    "excel": "08003 - ANTIGENO CARBOHIDRATO CA 19-9 ESTOMAGO"
  },
  "lab-cea": {
    "precio": 81.9,
    "precioAseguradora": 91,
    "resultado": "Unas 3 horas.",
    "excel": "08004 - CEA (antigeno carcinoembrionario)"
  },
  "lab-ca125": {
    "precio": 87.7,
    "precioAseguradora": 83.33,
    "resultado": "Unas 3 horas.",
    "excel": "08005 - CA-125 OVARIO"
  },
  "lab-ca153": {
    "precio": 87.7,
    "precioAseguradora": 83.33,
    "resultado": "Unas 3 horas.",
    "excel": "08006 - CA- 15-3 SENO"
  },
  "lab-fta": {
    "precio": 58.5,
    "precioAseguradora": 55.56,
    "resultado": "Unas 3 horas.",
    "excel": "09003 - FTA/ABS"
  },
  "lab-hepatitis-b": {
    "precio": 48.1,
    "precioAseguradora": 45.73,
    "resultado": "Unas 3 horas.",
    "excel": "09004 - ANTIGENO AUSTRALIANO.AG.HBS P.HEPATITIS"
  },
  "lab-hepatitis-c": {
    "precio": 56.1,
    "precioAseguradora": 53.34,
    "resultado": "Unas 3 horas.",
    "excel": "09010 - ANTICUERPOS P/ HEPATITIS \"C\""
  },
  "lab-covid": {
    "precio": 19,
    "precioAseguradora": 16.67,
    "resultado": "Unas 3 horas.",
    "excel": "09012 - PRUEBA RÁPIDA P/ANTÍGENO COVID-19"
  },
  "lab-sifilis": {
    "precio": 11.7,
    "precioAseguradora": 11.11,
    "resultado": "Unas 3 horas.",
    "excel": "09013 - P.R.S. (PRUEBA RÁPIDA PARA SÍFILIS) VDRL"
  },
  "lab-urocultivo": {
    "precio": 35,
    "precioAseguradora": 24.44,
    "resultado": "3 dias",
    "indicacion": "Realizar aseo previo, no se requiere la primera muestra de la mañana o según indicación médica.",
    "excel": "10006 - UROCULTIVO"
  },
  "lab-coprocultivo": {
    "precio": 35,
    "precioAseguradora": 24.44,
    "resultado": "3 dias",
    "indicacion": "No utilizar supositorios y que no contenga orina la muestra",
    "excel": "10007 - COPROCULTIVO"
  },
  "lab-hemocultivo": {
    "precio": 45,
    "precioAseguradora": 24.44,
    "resultado": "6 días",
    "excel": "10008 - HEMOCULTIVO"
  },
  "lab-heces": {
    "precio": 5.6,
    "precioAseguradora": 5.27,
    "resultado": "Unas 3 horas.",
    "indicacion": "No hacer uso de supositorios",
    "excel": "11001 - GENERAL DE HECES"
  },
  "lab-sangre-oculta": {
    "precio": 4.7,
    "precioAseguradora": 4.44,
    "resultado": "Unas 3 horas.",
    "indicacion": "72 horas (3 días) evitar el consumo de carnes rojas, remolacha, tomate, zanahoria u otros alimentos que puedan alterar el color de la muestra.",
    "excel": "11002 - SANGRE OCULTA EN HECES"
  },
  "lab-heces-azul-metileno": {
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "resultado": "Unas 3 horas.",
    "excel": "11003 - CITOLOGIA MOCO FECAL-AZUL DE METILENO"
  },
  "lab-rotavirus-adenovirus": {
    "precio": 46.8,
    "precioAseguradora": 44.44,
    "resultado": "Unas 3 horas.",
    "excel": "11004 - ROTAVIRUS EN HECES"
  },
  "lab-sustancias-reductoras": {
    "precio": 6.7,
    "precioAseguradora": 6.39,
    "resultado": "Unas 3 horas.",
    "excel": "11005 - SUSTANCIAS REDUCTORAS EN HECES"
  },
  "lab-ph-heces": {
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "resultado": "Unas 3 horas.",
    "excel": "11006 - PH EN HECES"
  },
  "lab-hpylori-heces": {
    "precio": 58.5,
    "precioAseguradora": 55.56,
    "resultado": "Unas 3 horas.",
    "indicacion": "Dejar de tomar cualquier antibiotico 2 semanas antes o medicamentos que contengan bismuto como peptobismol",
    "excel": "11008 - HELICOBACTER PILORY EN HECES"
  },
  "lab-salmonella-heces": {
    "precio": 46.8,
    "precioAseguradora": 44.44,
    "resultado": "Unas 3 horas.",
    "excel": "11009 - ANTÍGENO PARA SALMONELLA TIPHY EN HECES"
  },
  "lab-orina": {
    "precio": 5.6,
    "precioAseguradora": 5.27,
    "resultado": "Unas 3 horas.",
    "indicacion": "Realizar aseo, no usar cremas vaginales y la paciente no debe de andar con el periodo mestrual, (o según indicación médica).",
    "excel": "12001 - GENERAL DE ORINA"
  },
  "lab-embarazo-orina": {
    "precio": 6.7,
    "precioAseguradora": 6.39,
    "resultado": "Unas 3 horas.",
    "excel": "12002 - PRUEBA DE EMBARAZO EN ORINA"
  },
  "lab-tiroglobulina": {
    "precio": 67.8,
    "precioAseguradora": 64.45,
    "resultado": "Unas 3 horas.",
    "excel": "TIROGLOBULINA"
  },
  "lab-acido-valproico": {
    "precio": 43.3,
    "precioAseguradora": 41.11,
    "resultado": "Unas 3 horas.",
    "excel": "NIVELES DE ACIDO VALPROICO O VALPAQUINE"
  },
  "lab-toxo-avidez": {
    "precio": 58.5,
    "precioAseguradora": 55.56,
    "resultado": "Unas 3 horas.",
    "excel": "TOXO IGG AVIDEZ"
  },
  "lab-cortisol-am": {
    "precio": 94.9,
    "precioAseguradora": 90.16,
    "resultado": "Unas 3 horas.",
    "indicacion": "*Esta muestra se toma exactamente a las 8 de la mañana. * Dormir 8 horas la noche anterior al examen. * No tomar medicamentos anticonvulsivos, estrógenos, glucocorticoides, hidrocortisona, prednisona o andrógenos un día antes del examen. * No realizar ejercicios vigorosos un día antes del examen",
    "excel": "CORTISOL AM Y PM"
  },
  "lab-estradiol": {
    "precio": 119,
    "precioAseguradora": 113.05,
    "resultado": "Unas 3 horas.",
    "excel": "ESTRADIOL EN SANGRE"
  },
  "lab-progesterona": {
    "precio": 87.7,
    "precioAseguradora": 88.33,
    "resultado": "Unas 3 horas.",
    "excel": "PROGESTERONA"
  },
  "lab-testosterona": {
    "precio": 76,
    "precioAseguradora": 72.22,
    "resultado": "Unas 3 horas.",
    "excel": "TESTOSTERONA"
  },
  "lab-dengue-ns1": {
    "precio": 49.4,
    "precioAseguradora": 46.97,
    "resultado": "Unas 3 horas.",
    "excel": "ANTIGENO PARA DENGUE"
  },
  "lab-panel-respiratorio-ampliado": {
    "precio": 70,
    "resultado": "Unas 2 horas.",
    "indicacion": "Evitar el uso de spray o lavados nasales y abstenerse de introducir cualquier medicamento en las fosas nasales al menos 4 horas antes de la prueba.",
    "excel": "PANEL RESPIRATORIO  AMPLIADO"
  },
  "lab-panel-respiratorio": {
    "precio": 75,
    "precioAseguradora": 72.22,
    "resultado": "Unas 2 horas.",
    "indicacion": "Evitar el uso de spray o lavados nasales y abstenerse de introducir cualquier medicamento en las fosas nasales al menos 4 horas antes de la prueba.",
    "excel": "PANEL RESPIRATORIO  BASICO"
  },
  "lab-microsomales": {
    "precio": 70.2,
    "precioAseguradora": 66.67,
    "resultado": "Unas 3 horas.",
    "excel": "AC. ANTITIROIDEOS MICROSOMALES(antiperoxidasa)"
  },
  "lab-inmunoglobulina-igg": {
    "precio": 28.8,
    "precioAseguradora": 27.33,
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "excel": "INMUNOGLOBULINA IG \"G\""
  },
  "lab-inmunoglobulina-iga": {
    "precio": 54.2,
    "precioAseguradora": 51.5,
    "resultado": "Unas 3 horas.",
    "excel": "INMUNOGLOBULINA IG \"E\" TOTAL"
  },
  "lab-citomegalovirus": {
    "precio": 64.3,
    "precioAseguradora": 61.11,
    "resultado": "Unas 3 horas.",
    "excel": "ANTICUERPOS CITOMEGALOVIRUS IGM"
  },
  "lab-pro-bnp": {
    "precio": 93.6,
    "resultado": "Unas 3 horas.",
    "excel": "PRO BNP"
  },
  "lab-beta2-glicoproteina": {
    "precio": 175.4,
    "precioAseguradora": 166.67,
    "resultado": "Unas 3 horas.",
    "excel": "ANTI BETA 2 GLICOPROTEINA 1"
  },
  "lab-cultivo-vaginal": {
    "precio": 35,
    "precioAseguradora": 24.44,
    "resultado": "3 dias",
    "indicacion": "El paciente debe de ir con su médico ginecólogo tratante para que le tomen la muestra, nosotros solamente la recibimos para procesarla.",
    "excel": "CULTIVO Y ANTIBIOGRAMA VAGINAL *"
  },
  "lab-sexo-fetal": {
    "precio": 250,
    "resultado": "De 3 a 5 días hábiles",
    "indicacion": "Se realiza a partir de las 10 semanas de gestación",
    "excel": "TEST DE SEXO FETAL POR ADN"
  },
  "lab-panel-its": {
    "precio": 175.4,
    "resultado": "Unas 3 horas.",
    "indicacion": "El paciente debe de ir con su médico ginecólogo tratante para que le tomen la muestra, nosotros solamente la recibimos para procesarla.",
    "excel": "PANEL ITS"
  },
  "lab-relacion-albumina-creatinina": {
    "precio": 23.4,
    "precioAseguradora": 22.22,
    "resultado": "Unas 3 horas.",
    "excel": "RELACION ALBUMINA / CREATININA EN ORINA"
  },
  "lab-procalcitonina": {
    "precio": 90.1,
    "precioAseguradora": 85.56,
    "resultado": "Unas 3 horas.",
    "excel": "PROCALCITONINA"
  },
  "lab-herpes": {
    "precio": 46.8,
    "precioAseguradora": 44.44,
    "resultado": "Unas 3 horas.",
    "excel": "ANTICUERPOS PARA HERPES TIPO 1 + 2 IGM"
  },
  "lab-clamidia-sangre": {
    "precio": 58.5,
    "precioAseguradora": 55.56,
    "resultado": "Unas 3 horas.",
    "excel": "ANTICUERPOS PARA CLAMIDIA IGG"
  },
  "lab-anti-dna": {
    "precio": 46.8,
    "precioAseguradora": 44.45,
    "resultado": "Unas 3 horas.",
    "excel": "ANTI DNA NATIVO"
  },
  "lab-anti-ssa": {
    "precio": 80,
    "precioAseguradora": 88.89,
    "resultado": "Unas 3 horas.",
    "excel": "ANTICUERPOS ANTI-SSA/RO"
  },
  "lab-anti-ssb": {
    "precio": 50,
    "precioAseguradora": 55.56,
    "resultado": "Unas 3 horas.",
    "excel": "ANTICUERPOS ANTI-SSB/LA"
  },
  "lab-filtrado-glomerular": {
    "precio": 10.99,
    "precioAseguradora": 12.22,
    "resultado": "Unas 3 horas.",
    "excel": "FILTRADO GLOMERULAR"
  },
  "lab-peptido-citrulinado": {
    "precio": 45.51,
    "precioAseguradora": 50.56,
    "resultado": "Unas 3 horas.",
    "excel": "ANTI-CCP"
  },
  "lab-acido-folico": {
    "precio": 52.6,
    "precioAseguradora": 50,
    "resultado": "Unas 3 horas.",
    "excel": "NIVELES DE ACIDO FÓLICO"
  },
  "lab-transglutaminasa": {
    "precio": 98.2,
    "precioAseguradora": 98.2,
    "resultado": "Unas 3 horas.",
    "excel": "TRANSGLUTAMINASA IgA"
  }
};

export const EXAMENES_EXCEL: ExamenKb[] = [
  {
    "id": "lab-xl-01001",
    "tipo": "examen",
    "nombre": "Hemograma",
    "sinonimos": [
      "hemograma recuento plaquetas",
      "hemograma"
    ],
    "estado": "vigente",
    "precio": 9.75,
    "precioAseguradora": 7.77,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01001 - HEMOGRAMA (Recuento de plaquetas)"
  },
  {
    "id": "lab-xl-01002",
    "tipo": "examen",
    "nombre": "Hematocrito Y Hemoglobina",
    "sinonimos": [
      "hematocrito hemoglobina"
    ],
    "estado": "vigente",
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01002 - HEMATOCRITO Y HEMOGLOBINA"
  },
  {
    "id": "lab-xl-01003",
    "tipo": "examen",
    "nombre": "Leucograma Adulto",
    "sinonimos": [
      "leucograma adulto"
    ],
    "estado": "vigente",
    "precio": 7,
    "precioAseguradora": 6.65,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01003 - LEUCOGRAMA ADULTO"
  },
  {
    "id": "lab-xl-01005",
    "tipo": "examen",
    "nombre": "Reticulocitos",
    "sinonimos": [
      "reticulocitos"
    ],
    "estado": "vigente",
    "precio": 5.3,
    "precioAseguradora": 5,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01005 - RETICULOCITOS"
  },
  {
    "id": "lab-xl-01008",
    "tipo": "examen",
    "nombre": "Gota Gruesa",
    "sinonimos": [
      "gota gruesa"
    ],
    "estado": "vigente",
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01008 - GOTA GRUESA"
  },
  {
    "id": "lab-xl-celulas-l",
    "tipo": "examen",
    "nombre": "Celulas L.e",
    "sinonimos": [
      "celulas l"
    ],
    "estado": "vigente",
    "precio": 8,
    "precioAseguradora": 7.61,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): CELULAS L.E"
  },
  {
    "id": "lab-xl-01010",
    "tipo": "examen",
    "nombre": "Recuento Eosinofilos En Sangre",
    "sinonimos": [
      "recuento eosinofilos sangre"
    ],
    "estado": "vigente",
    "precio": 6.4,
    "precioAseguradora": 6.11,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01010 - RECUENTO EOSINOFILOS EN SANGRE"
  },
  {
    "id": "lab-xl-01011",
    "tipo": "examen",
    "nombre": "Eosinofilos En Secrecion Nasal",
    "sinonimos": [
      "eosinofilos secrecion nasal"
    ],
    "estado": "vigente",
    "precio": 6.4,
    "precioAseguradora": 6.11,
    "preparacion": "Evitar el uso de spray nasales, y terapias respiratorias por lo menos 3 horas antes de realizar el examen",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01011 - EOSINOFILOS EN SECRECION NASAL"
  },
  {
    "id": "lab-xl-01012",
    "tipo": "examen",
    "nombre": "Tiempo De Sangramiento",
    "sinonimos": [
      "tiempo sangramiento"
    ],
    "estado": "vigente",
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01012 - TIEMPO DE SANGRAMIENTO"
  },
  {
    "id": "lab-xl-01013",
    "tipo": "examen",
    "nombre": "Tiempo De Coagulacion",
    "sinonimos": [
      "tiempo coagulacion"
    ],
    "estado": "vigente",
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01013 - TIEMPO DE COAGULACION"
  },
  {
    "id": "lab-xl-01014",
    "tipo": "examen",
    "nombre": "Tiempo Y Valor Protrombina",
    "sinonimos": [
      "tiempo protrombina tvp",
      "tiempo protrombina"
    ],
    "estado": "vigente",
    "precio": 8.5,
    "precioAseguradora": 8.06,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01014 - TIEMPO Y VALOR PROTROMBINA (TVP)"
  },
  {
    "id": "lab-xl-01016",
    "tipo": "examen",
    "nombre": "Tiempo De Trombina",
    "sinonimos": [
      "tiempo trombina"
    ],
    "estado": "vigente",
    "precio": 12.1,
    "precioAseguradora": 11.45,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01016 - TIEMPO DE TROMBINA"
  },
  {
    "id": "lab-xl-01017",
    "tipo": "examen",
    "nombre": "Fibrinogeno",
    "sinonimos": [
      "fibrinogeno"
    ],
    "estado": "vigente",
    "precio": 17.5,
    "precioAseguradora": 16.66,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 01017 - FIBRINOGENO"
  },
  {
    "id": "lab-xl-cruzada",
    "tipo": "examen",
    "nombre": "Prueba Cruzada",
    "sinonimos": [
      "cruzada"
    ],
    "estado": "vigente",
    "precio": 43,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 1 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): PRUEBA CRUZADA"
  },
  {
    "id": "lab-xl-02003",
    "tipo": "examen",
    "nombre": "Coombs Directo",
    "sinonimos": [
      "coombs directo"
    ],
    "estado": "vigente",
    "precio": 7.4,
    "precioAseguradora": 7.01,
    "preparacion": "Ningua",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 02003 - COOMBS DIRECTO"
  },
  {
    "id": "lab-xl-anticuerpos-anti-rh",
    "tipo": "examen",
    "nombre": "Anticuerpos Anti-rh",
    "sinonimos": [
      "anticuerpos anti rh"
    ],
    "estado": "vigente",
    "precio": 21.4,
    "precioAseguradora": 20.33,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS ANTI-RH"
  },
  {
    "id": "lab-xl-03003",
    "tipo": "examen",
    "nombre": "Tolerancia Glucosa 2 Horas",
    "sinonimos": [
      "tolerancia glucosa 2 horas"
    ],
    "estado": "vigente",
    "precio": 28.8,
    "precioAseguradora": 27.33,
    "preparacion": "Ayuno mínimo de 8 horas a un máximo de 10 horas o según indicación (el ayuno comienza a partir de la cena), permanecerá en el laboratorio un aproximado de 3 horas, cada hora estará dando muestra de orina y de sangre.",
    "resultado": "Desde la ultima toma De 3 horas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03003 - TOLERANCIA GLUCOSA 2 HORAS"
  },
  {
    "id": "lab-xl-03004",
    "tipo": "examen",
    "nombre": "Tolerancia Glucosa 3 Horas Con Prudex",
    "sinonimos": [
      "tolerancia glucosa 3 horas prudex"
    ],
    "estado": "vigente",
    "precio": 28.8,
    "precioAseguradora": 27.33,
    "preparacion": "Ayuno mínimo de 8 horas a un máximo de 10 horas o según indicación (el ayuno comienza a partir de la cena), permanecerá en el laboratorio un aproximado de 4 horas, cada hora estará dando muestra de orina y de sangre.",
    "resultado": "Desde la ultima toma De 3 horas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03004 - TOLERANCIA GLUCOSA 3 HORAS CON PRUDEX"
  },
  {
    "id": "lab-xl-03005",
    "tipo": "examen",
    "nombre": "Tolerancia Glucosa 5 Horas Con Prudex",
    "sinonimos": [
      "tolerancia glucosa 5 horas prudex"
    ],
    "estado": "vigente",
    "precio": 44.5,
    "precioAseguradora": 42.22,
    "preparacion": "Ayuno mínimo de 8 horas a un máximo de 10 horas o según indicación (el ayuno comienza a partir de la cena), permanecerá en el laboratorio un aproximado de 6 horas, cada hora estará dando muestra de orina y de sangre.",
    "resultado": "Desde la ultima toma De 3 horas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03005 - TOLERANCIA GLUCOSA 5 HORAS CON PRUDEX"
  },
  {
    "id": "lab-xl-03006",
    "tipo": "examen",
    "nombre": "Glucosa Post-ingesto Dextrosa 75 Gr.",
    "sinonimos": [
      "glucosa post ingesto dextrosa 75 gr"
    ],
    "estado": "vigente",
    "precio": 20.1,
    "precioAseguradora": 19.06,
    "preparacion": "Ayuno máximo de 8h a un máximo de 12h o según indicación medica",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03006 - GLUCOSA POST-INGESTO DEXTROSA 75 GR."
  },
  {
    "id": "lab-xl-03016",
    "tipo": "examen",
    "nombre": "Colesterol Muy Baja Densidad",
    "sinonimos": [
      "colesterol muy baja densidad vldl",
      "colesterol muy baja densidad"
    ],
    "estado": "vigente",
    "precio": 14,
    "precioAseguradora": 13.33,
    "preparacion": "Ayuno mínimo de 8h a un máximo de 12h o según indicación medica",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03016 - COLESTEROL MUY BAJA DENSIDAD (VLDL)"
  },
  {
    "id": "lab-xl-03020",
    "tipo": "examen",
    "nombre": "Electrolitos En Orina De 24 Horas",
    "sinonimos": [
      "electrolitos orina 24 horas"
    ],
    "estado": "vigente",
    "precio": 18.7,
    "precioAseguradora": 17.78,
    "preparacion": "Para poder recolectar esta muestra, la primera orina debe desecharla. A partir de la segunda micción, debe recolectar toda la orina durante 24 horas. Puede utilizar un recipiente grande, como una garrafa de galón de agua, por ejemplo, el galón de agua Alpina",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03020 - ELECTROLITOS EN ORINA DE 24 HORAS"
  },
  {
    "id": "lab-xl-03022",
    "tipo": "examen",
    "nombre": "Cloro En Sangre",
    "sinonimos": [
      "cloro sangre"
    ],
    "estado": "vigente",
    "precio": 6,
    "precioAseguradora": 5.73,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03022 - CLORO EN SANGRE"
  },
  {
    "id": "lab-xl-03028",
    "tipo": "examen",
    "nombre": "Captacion Y Fijacion De Hierro",
    "sinonimos": [
      "captacion fijacion hierro"
    ],
    "estado": "vigente",
    "precio": 22.7,
    "precioAseguradora": 21.61,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03028 - CAPTACION Y FIJACION DE HIERRO"
  },
  {
    "id": "lab-xl-03031",
    "tipo": "examen",
    "nombre": "Vitamina B-12",
    "sinonimos": [
      "vitamina b 12"
    ],
    "estado": "vigente",
    "precio": 65.5,
    "precioAseguradora": 62.23,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03031 - VITAMINA B-12"
  },
  {
    "id": "lab-xl-03033",
    "tipo": "examen",
    "nombre": "Micro Albuminuria En Orina De 24 Horas",
    "sinonimos": [
      "micro albuminuria orina 24 horas"
    ],
    "estado": "vigente",
    "precio": 34,
    "precioAseguradora": 32.28,
    "preparacion": "Para poder recolectar esta muestra, la primera orina debe desecharla. A partir de la segunda micción, debe recolectar toda la orina durante 24 horas. Puede utilizar un recipiente grande, como una garrafa de galón de agua, por ejemplo, el galón de agua Alpina",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03033 - MICRO ALBUMINURIA EN ORINA DE 24 HORAS"
  },
  {
    "id": "lab-xl-03034",
    "tipo": "examen",
    "nombre": "Fosforo En Orina De 24 Horas",
    "sinonimos": [
      "fosforo orina 24 horas"
    ],
    "estado": "vigente",
    "precio": 20.1,
    "precioAseguradora": 19.06,
    "preparacion": "Para poder recolectar esta muestra, la primera orina debe desecharla. A partir de la segunda micción, debe recolectar toda la orina durante 24 horas. Puede utilizar un recipiente grande, como una garrafa de galón de agua, por ejemplo, el galón de agua Alpina",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 03034 - FOSFORO EN ORINA DE 24 HORAS"
  },
  {
    "id": "lab-xl-04001",
    "tipo": "examen",
    "nombre": "S.g.o.t",
    "sinonimos": [
      "s g t"
    ],
    "estado": "vigente",
    "precio": 9,
    "precioAseguradora": 8.34,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 04001 - S.G.O.T"
  },
  {
    "id": "lab-xl-04002",
    "tipo": "examen",
    "nombre": "S.g.p.t",
    "sinonimos": [
      "s g p t"
    ],
    "estado": "vigente",
    "precio": 9,
    "precioAseguradora": 8.34,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 04002 - S.G.P.T"
  },
  {
    "id": "lab-xl-04007",
    "tipo": "examen",
    "nombre": "Deshidrogenasa Lactica",
    "sinonimos": [
      "deshidrogenasa lactica l d h",
      "deshidrogenasa lactica"
    ],
    "estado": "vigente",
    "precio": 11.4,
    "precioAseguradora": 10.84,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 04007 - DESHIDROGENASA LACTICA ( L.D.H )"
  },
  {
    "id": "lab-xl-04009",
    "tipo": "examen",
    "nombre": "Creatino Fosfoquinasa Fraccion Mb (Cpk/m",
    "sinonimos": [
      "creatino fosfoquinasa fraccion mb cpk m"
    ],
    "estado": "vigente",
    "precio": 30.1,
    "precioAseguradora": 28.61,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 04009 - CREATINO FOSFOQUINASA FRACCION MB (CPK/M"
  },
  {
    "id": "lab-xl-04010",
    "tipo": "examen",
    "nombre": "Proteina C. Reactiva Cardiaca",
    "sinonimos": [
      "proteina c reactiva cardiaca"
    ],
    "estado": "vigente",
    "precio": 51.5,
    "precioAseguradora": 48.89,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 04010 - PROTEINA C. REACTIVA CARDIACA"
  },
  {
    "id": "lab-xl-05004",
    "tipo": "examen",
    "nombre": "Anti-estreptolisina \"o\"",
    "sinonimos": [
      "anti estreptolisina s t",
      "anti estreptolisina"
    ],
    "estado": "vigente",
    "precio": 14.7,
    "precioAseguradora": 14,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 05004 - ANTI-ESTREPTOLISINA \"O\" (A.S.T.O.)"
  },
  {
    "id": "lab-xl-05005",
    "tipo": "examen",
    "nombre": "Prueba De Artritis Reumatoidea.latex Ra",
    "sinonimos": [
      "artritis reumatoidea latex ra"
    ],
    "estado": "vigente",
    "precio": 11.4,
    "precioAseguradora": 10.84,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 05005 - PRUEBA DE ARTRITIS REUMATOIDEA.LATEX RA"
  },
  {
    "id": "lab-xl-05011",
    "tipo": "examen",
    "nombre": "Anticardiolipina Igm",
    "sinonimos": [
      "anticardiolipina igm"
    ],
    "estado": "vigente",
    "precio": 100.3,
    "precioAseguradora": 95.27,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 05011 - ANTICARDIOLIPINA IGM"
  },
  {
    "id": "lab-xl-05012",
    "tipo": "examen",
    "nombre": "Ac. Lupus Anticoagulante",
    "sinonimos": [
      "ac lupus anticoagulante"
    ],
    "estado": "vigente",
    "precio": 100.3,
    "precioAseguradora": 95.27,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 05012 - AC. LUPUS ANTICOAGULANTE"
  },
  {
    "id": "lab-xl-anticuerpos-antifosfolipidos",
    "tipo": "examen",
    "nombre": "Anticuerpos Antifosfolipidos",
    "sinonimos": [
      "anticuerpos antifosfolipidos"
    ],
    "estado": "vigente",
    "precio": 103.6,
    "precioAseguradora": 98.45,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS ANTIFOSFOLIPIDOS"
  },
  {
    "id": "lab-xl-05014",
    "tipo": "examen",
    "nombre": "Anticuerpos Antimitocondriales",
    "sinonimos": [
      "anticuerpos antimitocondriales"
    ],
    "estado": "vigente",
    "precio": 62.9,
    "precioAseguradora": 59.73,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 05014 - ANTICUERPOS ANTIMITOCONDRIALES"
  },
  {
    "id": "lab-xl-05016",
    "tipo": "examen",
    "nombre": "Prueba De Chagas",
    "sinonimos": [
      "chagas"
    ],
    "estado": "vigente",
    "precio": 36.2,
    "precioAseguradora": 34.34,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 05016 - PRUEBA DE CHAGAS"
  },
  {
    "id": "lab-xl-05017",
    "tipo": "examen",
    "nombre": "H. Pylori /en Suero",
    "sinonimos": [
      "h pylori suero"
    ],
    "estado": "vigente",
    "precio": 41.5,
    "precioAseguradora": 39.39,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 05017 - H. PYLORI /EN SUERO"
  },
  {
    "id": "lab-xl-06002",
    "tipo": "examen",
    "nombre": "T-3",
    "sinonimos": [
      "t 3"
    ],
    "estado": "vigente",
    "precio": 17.5,
    "precioAseguradora": 16.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 06002 - T-3"
  },
  {
    "id": "lab-xl-06004",
    "tipo": "examen",
    "nombre": "T-4",
    "sinonimos": [
      "t 4"
    ],
    "estado": "vigente",
    "precio": 17.5,
    "precioAseguradora": 16.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 06004 - T-4"
  },
  {
    "id": "lab-xl-06005",
    "tipo": "examen",
    "nombre": "T-4 Libre",
    "sinonimos": [
      "t 4 libre"
    ],
    "estado": "vigente",
    "precio": 21.1,
    "precioAseguradora": 20,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 06005 - T-4 LIBRE"
  },
  {
    "id": "lab-xl-07002",
    "tipo": "examen",
    "nombre": "Chlamydia Trachomatis",
    "sinonimos": [
      "chlamydia trachomatis c t",
      "chlamydia trachomatis"
    ],
    "estado": "vigente",
    "precio": 115.8,
    "precioAseguradora": 110,
    "preparacion": "*La muestra debe ser tomada por el médico de cabecera. *No realizar lavados vaginales. *No utilizar tampones. *No usar medicamentos vaginales durante al menos 48 horas previas. *Mantener abstinencia sexual durante los 3 días anteriores a la toma",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07002 - CHLAMYDIA TRACHOMATIS (C.T)"
  },
  {
    "id": "lab-xl-07003",
    "tipo": "examen",
    "nombre": "Neisseria Gonorrhoeae",
    "sinonimos": [
      "neisseria gonorrhoeae"
    ],
    "estado": "vigente",
    "precio": 115.8,
    "precioAseguradora": 110,
    "preparacion": "*La muestra debe ser tomada por el médico de cabecera. *No realizar lavados vaginales. *No utilizar tampones. *No usar medicamentos vaginales durante al menos 48 horas previas. *Mantener abstinencia sexual durante los 3 días anteriores a la toma",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07003 - NEISSERIA GONORRHOEAE"
  },
  {
    "id": "lab-xl-07005",
    "tipo": "examen",
    "nombre": "Ca- 15-3 Mama",
    "sinonimos": [
      "ca 15 3 mama"
    ],
    "estado": "vigente",
    "precio": 87.72,
    "precioAseguradora": 83.33,
    "preparacion": "Ninguna o según indicacion medica",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07005 - CA- 15-3 MAMA"
  },
  {
    "id": "lab-xl-07007",
    "tipo": "examen",
    "nombre": "Ca De Prostata",
    "sinonimos": [
      "ca prostata pca3",
      "ca prostata"
    ],
    "estado": "vigente",
    "precio": 610,
    "precioAseguradora": 677.78,
    "preparacion": "Ninguna o según indicacion medica",
    "resultado": "3 a 5 semanas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07007 - CA DE PROSTATA (PCA3)"
  },
  {
    "id": "lab-xl-07008",
    "tipo": "examen",
    "nombre": "Visibilit",
    "sinonimos": [
      "visibilit trisomia 18 21",
      "visibilit"
    ],
    "estado": "vigente",
    "precio": 715,
    "precioAseguradora": 794.44,
    "preparacion": "Ninguna o según indicacion medica",
    "resultado": "3 a 5 semanas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07008 - VISIBILIT (TRISOMIA 18 Y 21)"
  },
  {
    "id": "lab-xl-07009",
    "tipo": "examen",
    "nombre": "Maternit21",
    "sinonimos": [
      "maternit21 trisomia 13 18 21",
      "maternit21"
    ],
    "estado": "vigente",
    "precio": 991.5,
    "precioAseguradora": 1101.66,
    "preparacion": "Ninguna o según indicacion medica",
    "resultado": "3 a 5 semanas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07009 - MATERNIT21 (TRISOMIA 13, 18 Y 21)"
  },
  {
    "id": "lab-xl-07010",
    "tipo": "examen",
    "nombre": "Cariotipo Mas Fish En Liquido Amniotico",
    "sinonimos": [
      "cariotipo mas fish liquido amniotico"
    ],
    "estado": "vigente",
    "precio": 880,
    "precioAseguradora": 977.78,
    "preparacion": "Ninguna o según indicacion medica",
    "resultado": "3 a 5 semanas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07010 - CARIOTIPO MAS FISH EN LIQUIDO AMNIOTICO"
  },
  {
    "id": "lab-xl-07011",
    "tipo": "examen",
    "nombre": "Fibrosis Quistica",
    "sinonimos": [
      "fibrosis quistica"
    ],
    "estado": "vigente",
    "precio": 525,
    "precioAseguradora": 583.33,
    "preparacion": "Ninguna o según indicacion medica",
    "resultado": "3 a 5 semanas",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 07011 - FIBROSIS QUISTICA"
  },
  {
    "id": "lab-xl-08002",
    "tipo": "examen",
    "nombre": "Antigeno Prostatico Especifico Libre",
    "sinonimos": [
      "antigeno prostatico especifico libre psa libre",
      "antigeno prostatico especifico libre"
    ],
    "estado": "vigente",
    "precio": 81.9,
    "precioAseguradora": 77.78,
    "preparacion": "Para esta prueba 24 horas previas a la prueba: - Evitar ejercicios rigurosos. - Evitar relaciones sexuales. - Evitar masturbaciones.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 08002 - ANTIGENO PROSTATICO ESPECIFICO LIBRE (PSA LIBRE)"
  },
  {
    "id": "lab-xl-alfa-feto-proteina-afp",
    "tipo": "examen",
    "nombre": "Alfa Feto Proteina",
    "sinonimos": [
      "alfa feto proteina afp",
      "alfa feto proteina"
    ],
    "estado": "vigente",
    "precio": 70.2,
    "precioAseguradora": 66.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ALFA FETO PROTEINA (AFP)"
  },
  {
    "id": "lab-xl-09001",
    "tipo": "examen",
    "nombre": "H.i.v.",
    "sinonimos": [
      "h i v"
    ],
    "estado": "vigente",
    "precio": 37.4,
    "precioAseguradora": 35.56,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 09001 - H.I.V."
  },
  {
    "id": "lab-xl-09005",
    "tipo": "examen",
    "nombre": "Anticuerpos Toxoplasmosis Ig \"g\"",
    "sinonimos": [
      "anticuerpos toxoplasmosis ig g"
    ],
    "estado": "vigente",
    "precio": 40.9,
    "precioAseguradora": 39.89,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 09005 - ANTICUERPOS TOXOPLASMOSIS IG \"G\""
  },
  {
    "id": "lab-xl-09006",
    "tipo": "examen",
    "nombre": "Anticuerpos Toxoplasmosis Ig \"m\"",
    "sinonimos": [
      "anticuerpos toxoplasmosis ig m"
    ],
    "estado": "vigente",
    "precio": 40.9,
    "precioAseguradora": 38.89,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 09006 - ANTICUERPOS TOXOPLASMOSIS IG \"M\""
  },
  {
    "id": "lab-xl-09007",
    "tipo": "examen",
    "nombre": "Anticuerpos Rubeola Ig \"g\"",
    "sinonimos": [
      "anticuerpos rubeola ig g"
    ],
    "estado": "vigente",
    "precio": 44.4,
    "precioAseguradora": 42.22,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 09007 - ANTICUERPOS RUBEOLA IG \"G\""
  },
  {
    "id": "lab-xl-09008",
    "tipo": "examen",
    "nombre": "Anticuerpos Rubeola Ig \"m\"",
    "sinonimos": [
      "anticuerpos rubeola ig m"
    ],
    "estado": "vigente",
    "precio": 44.4,
    "precioAseguradora": 42.22,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 09008 - ANTICUERPOS RUBEOLA IG \"M\""
  },
  {
    "id": "lab-xl-09009",
    "tipo": "examen",
    "nombre": "Anticuerpos Ig \"m\" Para Hepatitis \"a\"",
    "sinonimos": [
      "anticuerpos ig m hepatitis"
    ],
    "estado": "vigente",
    "precio": 62.4,
    "precioAseguradora": 59.27,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 09009 - ANTICUERPOS IG \"M\" PARA HEPATITIS \"A\""
  },
  {
    "id": "lab-xl-09011",
    "tipo": "examen",
    "nombre": "Prueba Rápida P/anticuerpos Covid-19 Igg E Igm",
    "sinonimos": [
      "rapida p anticuerpos covid 19 igg igm"
    ],
    "estado": "vigente",
    "precio": 70.2,
    "precioAseguradora": 66.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 09011 - PRUEBA RÁPIDA P/ANTICUERPOS COVID-19 IgG E IgM"
  },
  {
    "id": "lab-xl-10001",
    "tipo": "examen",
    "nombre": "Cultivo Y Antibiograma Para No Bar",
    "sinonimos": [
      "cultivo antibiograma no bar"
    ],
    "estado": "vigente",
    "precio": 14.7,
    "preparacion": "No requiere preparación previa.",
    "resultado": "3 dias",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 10001 - CULTIVO Y ANTIBIOGRAMA PARA NO BAR"
  },
  {
    "id": "lab-xl-10002",
    "tipo": "examen",
    "nombre": "Coloracion De Gram",
    "sinonimos": [
      "coloracion gram"
    ],
    "estado": "vigente",
    "precio": 7,
    "precioAseguradora": 6.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 10002 - COLORACION DE GRAM"
  },
  {
    "id": "lab-xl-10003",
    "tipo": "examen",
    "nombre": "Cultivo P/acido Resistente - Baar",
    "sinonimos": [
      "cultivo p acido resistente baar"
    ],
    "estado": "vigente",
    "precio": 20.8,
    "preparacion": "No requiere preparación previa.",
    "resultado": "3 dias",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 10003 - CULTIVO P/ACIDO RESISTENTE - BAAR"
  },
  {
    "id": "lab-xl-10004",
    "tipo": "examen",
    "nombre": "Directo Al Fresco Secrecion",
    "sinonimos": [
      "directo fresco secrecion"
    ],
    "estado": "vigente",
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 10004 - DIRECTO AL FRESCO SECRECION"
  },
  {
    "id": "lab-xl-10005",
    "tipo": "examen",
    "nombre": "Directo Al Fresco Secrecion Vaginal",
    "sinonimos": [
      "directo fresco secrecion vaginal"
    ],
    "estado": "vigente",
    "precio": 5.8,
    "precioAseguradora": 5.55,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 10005 - DIRECTO AL FRESCO SECRECION VAGINAL"
  },
  {
    "id": "lab-xl-10009",
    "tipo": "examen",
    "nombre": "Cultivo Y Antibiograma Semen",
    "sinonimos": [
      "cultivo antibiograma semen"
    ],
    "estado": "vigente",
    "precio": 35,
    "precioAseguradora": 24.44,
    "preparacion": "No requiere preparación previa.",
    "resultado": "3 dias",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 10009 - CULTIVO Y ANTIBIOGRAMA SEMEN"
  },
  {
    "id": "lab-xl-inmunofluorescencia-salmonella-tiphy",
    "tipo": "examen",
    "nombre": "Inmunofluorescencia/salmonella Tiphy",
    "sinonimos": [
      "inmunofluorescencia salmonella tiphy"
    ],
    "estado": "vigente",
    "precio": 46.8,
    "precioAseguradora": 44.45,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): INMUNOFLUORESCENCIA/SALMONELLA TIPHY"
  },
  {
    "id": "lab-xl-12003",
    "tipo": "examen",
    "nombre": "Albumina En Orina Al Azar",
    "sinonimos": [
      "albumina orina azar"
    ],
    "estado": "vigente",
    "precio": 3.5,
    "precioAseguradora": 3.33,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): 12003 - ALBUMINA EN ORINA AL AZAR"
  },
  {
    "id": "lab-xl-coloracion-zeehl-neelsen-acido-resistent",
    "tipo": "examen",
    "nombre": "Coloración Zeehl Neelsen-acido Resistente",
    "sinonimos": [
      "coloracion zeehl neelsen acido resistente esputo",
      "coloracion zeehl neelsen acido resistente"
    ],
    "estado": "vigente",
    "precio": 6,
    "precioAseguradora": 5.73,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): COLORACIÓN ZEEHL NEELSEN-ACIDO RESISTENTE (ESPUTO)"
  },
  {
    "id": "lab-xl-testosterona-libre",
    "tipo": "examen",
    "nombre": "Testosterona Libre",
    "sinonimos": [
      "testosterona libre"
    ],
    "estado": "vigente",
    "precio": 76,
    "precioAseguradora": 72.22,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): TESTOSTERONA LIBRE"
  },
  {
    "id": "lab-xl-anticuerpos-antitiroideos-tiroglobulinic",
    "tipo": "examen",
    "nombre": "Anticuerpos Antitiroideos Tiroglobulinic",
    "sinonimos": [
      "anticuerpos antitiroideos tiroglobulinic"
    ],
    "estado": "vigente",
    "precio": 70.2,
    "precioAseguradora": 66.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS ANTITIROIDEOS TIROGLOBULINIC"
  },
  {
    "id": "lab-xl-duo-dengue-antigeno-anticuerpos",
    "tipo": "examen",
    "nombre": "Duo Dengue Antigeno Y Anticuerpos",
    "sinonimos": [
      "duo dengue antigeno anticuerpos"
    ],
    "estado": "vigente",
    "precio": 46.8,
    "preparacion": "Tener mas de 48 horas de fiebre",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): DUO DENGUE ANTIGENO Y ANTICUERPOS"
  },
  {
    "id": "lab-xl-anticuerpos-igg-igm-dengue",
    "tipo": "examen",
    "nombre": "Anticuerpos Igg E Igm Para Dengue",
    "sinonimos": [
      "anticuerpos igg igm dengue"
    ],
    "estado": "vigente",
    "precio": 36.3,
    "precioAseguradora": 34.44,
    "preparacion": "Tener mas de 48 horas de fiebre",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS IgG E IgM PARA DENGUE"
  },
  {
    "id": "lab-xl-estrogenos-sangre",
    "tipo": "examen",
    "nombre": "Estrogenos En Sangre",
    "sinonimos": [
      "estrogenos sangre"
    ],
    "estado": "vigente",
    "precio": 80.7,
    "precioAseguradora": 76.66,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ESTROGENOS EN SANGRE"
  },
  {
    "id": "lab-xl-peptido-c",
    "tipo": "examen",
    "nombre": "Peptido C",
    "sinonimos": [
      "peptido c"
    ],
    "estado": "vigente",
    "precio": 87.7,
    "precioAseguradora": 88.33,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): PEPTIDO C"
  },
  {
    "id": "lab-xl-anticuerpos-zika-chikungunya-dengue-igg",
    "tipo": "examen",
    "nombre": "Anticuerpos Para Zika, Chikungunya, Dengue Igg",
    "sinonimos": [
      "anticuerpos zika chikungunya dengue igg"
    ],
    "estado": "vigente",
    "precio": 93.6,
    "precioAseguradora": 88.89,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS PARA ZIKA, CHIKUNGUNYA, DENGUE IGG"
  },
  {
    "id": "lab-xl-hemoglobina-electroforecis",
    "tipo": "examen",
    "nombre": "Hemoglobina Por Electroforecis",
    "sinonimos": [
      "hemoglobina electroforecis"
    ],
    "estado": "vigente",
    "precio": 210.5,
    "precioAseguradora": 200,
    "preparacion": "Unicamente se toma los días martes desde las 6 am a 7 am (el paciente debe de estar antes de las 6am)",
    "resultado": "De 22 días a 1 mes",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): HEMOGLOBINA POR ELECTROFORECIS"
  },
  {
    "id": "lab-xl-inmunoglobulina-ig-m",
    "tipo": "examen",
    "nombre": "Inmunoglobulina Ig \"m\"",
    "sinonimos": [
      "inmunoglobulina ig m"
    ],
    "estado": "vigente",
    "precio": 28.8,
    "precioAseguradora": 27.33,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): INMUNOGLOBULINA IG \"M\""
  },
  {
    "id": "lab-xl-inmunoglobulina-ig",
    "tipo": "examen",
    "nombre": "Inmunoglobulina Ig \"a\"",
    "sinonimos": [
      "inmunoglobulina ig"
    ],
    "estado": "vigente",
    "precio": 19.4,
    "precioAseguradora": 18.39,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): INMUNOGLOBULINA IG \"A\""
  },
  {
    "id": "lab-xl-dimero-d-sangre",
    "tipo": "examen",
    "nombre": "Dimero D En Sangre",
    "sinonimos": [
      "dimero d sangre"
    ],
    "estado": "vigente",
    "precio": 93.6,
    "precioAseguradora": 88.89,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): DIMERO D EN SANGRE"
  },
  {
    "id": "lab-xl-anticuerpos-citomegalovirus-ig-g",
    "tipo": "examen",
    "nombre": "Anticuerpos Citomegalovirus Ig \"g\"",
    "sinonimos": [
      "anticuerpos citomegalovirus ig g"
    ],
    "estado": "vigente",
    "precio": 64.3,
    "precioAseguradora": 61.11,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS CITOMEGALOVIRUS IG \"G\""
  },
  {
    "id": "lab-xl-amonio-sangre",
    "tipo": "examen",
    "nombre": "Amonio En Sangre",
    "sinonimos": [
      "amonio sangre"
    ],
    "estado": "vigente",
    "precio": 49.1,
    "precioAseguradora": 46.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): AMONIO EN SANGRE"
  },
  {
    "id": "lab-xl-tolerancia-insulina-5-horas",
    "tipo": "examen",
    "nombre": "Tolerancia de insulina de 5 horas",
    "sinonimos": [
      "tolerancia insulina 5 horas",
      "tolerancia insulina"
    ],
    "estado": "vigente",
    "precio": 288,
    "precioAseguradora": 266.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): TOLERANCIA DE INSULINA (5  HORAS)"
  },
  {
    "id": "lab-xl-tolerancia-insulina-3-horas",
    "tipo": "examen",
    "nombre": "Tolerancia de insulina de 3 horas",
    "sinonimos": [
      "tolerancia insulina 3 horas",
      "tolerancia insulina"
    ],
    "estado": "vigente",
    "precio": 192,
    "precioAseguradora": 177.78,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): TOLERANCIA DE INSULINA (3 HORAS)"
  },
  {
    "id": "lab-xl-tolerancia-insulina-2-horas",
    "tipo": "examen",
    "nombre": "Tolerancia Insulina 2 Horas",
    "sinonimos": [
      "tolerancia insulina 2 horas"
    ],
    "estado": "vigente",
    "precio": 144,
    "precioAseguradora": 55.56,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): TOLERANCIA INSULINA 2 HORAS"
  },
  {
    "id": "lab-xl-retraccion-coagulo",
    "tipo": "examen",
    "nombre": "Retraccion Del Coagulo",
    "sinonimos": [
      "retraccion coagulo"
    ],
    "estado": "vigente",
    "precio": 5.7,
    "precioAseguradora": 3.23,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): RETRACCION DEL COAGULO"
  },
  {
    "id": "lab-xl-calcio-orina",
    "tipo": "examen",
    "nombre": "Calcio En Orina",
    "sinonimos": [
      "calcio orina"
    ],
    "estado": "vigente",
    "precio": 8.1,
    "precioAseguradora": 7.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): CALCIO EN ORINA"
  },
  {
    "id": "lab-xl-toma-muestra-domicilio",
    "tipo": "examen",
    "nombre": "Toma De Muestra A Domicilio",
    "sinonimos": [
      "toma muestra domicilio"
    ],
    "estado": "vigente",
    "precio": 9.4,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): TOMA DE MUESTRA A DOMICILIO *"
  },
  {
    "id": "lab-xl-cristalizacion-helechos",
    "tipo": "examen",
    "nombre": "Cristalizacion De Helechos",
    "sinonimos": [
      "cristalizacion helechos"
    ],
    "estado": "vigente",
    "precio": 9.4,
    "precioAseguradora": 8.89,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): CRISTALIZACION DE HELECHOS"
  },
  {
    "id": "lab-xl-albumina-sangre",
    "tipo": "examen",
    "nombre": "Albumina En Sangre",
    "sinonimos": [
      "albumina sangre"
    ],
    "estado": "vigente",
    "precio": 6.7,
    "precioAseguradora": 6.39,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ALBUMINA EN SANGRE"
  },
  {
    "id": "lab-xl-anticuerpos-anti-rh-aglutinina-salina",
    "tipo": "examen",
    "nombre": "Anticuerpos anti-Rh (aglutinina salina)",
    "sinonimos": [
      "anticuerpos anti rh aglutinina salina",
      "anticuerpos anti rh"
    ],
    "estado": "vigente",
    "precio": 21.4,
    "precioAseguradora": 20.33,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS ANTI-RH (AGLUTININA SALINA)"
  },
  {
    "id": "lab-xl-proteinas-orina-azar",
    "tipo": "examen",
    "nombre": "Proteinas En Orina Al Azar",
    "sinonimos": [
      "proteinas orina azar"
    ],
    "estado": "vigente",
    "precio": 6.3,
    "precioAseguradora": 6,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): PROTEINAS EN ORINA AL AZAR"
  },
  {
    "id": "lab-xl-hormona-paratiroidea-p-t-h",
    "tipo": "examen",
    "nombre": "Hormona Paratiroidea",
    "sinonimos": [
      "hormona paratiroidea p t h",
      "hormona paratiroidea"
    ],
    "estado": "vigente",
    "precio": 147,
    "precioAseguradora": 139.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): HORMONA PARATIROIDEA  (P.T.H)"
  },
  {
    "id": "lab-xl-urea-sangre",
    "tipo": "examen",
    "nombre": "Urea En Sangre",
    "sinonimos": [
      "urea sangre"
    ],
    "estado": "vigente",
    "precio": 9.5,
    "precioAseguradora": 9.05,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): UREA EN SANGRE"
  },
  {
    "id": "lab-xl-anticuerpos-herpes-tipo-1-2-igg",
    "tipo": "examen",
    "nombre": "Anticuerpos Para Herpes Tipo 1+2 Igg",
    "sinonimos": [
      "anticuerpos herpes tipo 1 2 igg"
    ],
    "estado": "vigente",
    "precio": 46.8,
    "precioAseguradora": 44.44,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS PARA HERPES TIPO 1+2 IGG"
  },
  {
    "id": "lab-xl-anticuerpos-chagas",
    "tipo": "examen",
    "nombre": "Anticuerpos Para Chagas",
    "sinonimos": [
      "anticuerpos chagas"
    ],
    "estado": "vigente",
    "precio": 36.2,
    "precioAseguradora": 34.34,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS PARA CHAGAS"
  },
  {
    "id": "lab-xl-hormona-adrenocorticotropica-acth",
    "tipo": "examen",
    "nombre": "Hormona Adrenocorticotropica Acth",
    "sinonimos": [
      "hormona adrenocorticotropica acth"
    ],
    "estado": "vigente",
    "precio": 117,
    "precioAseguradora": 111.11,
    "preparacion": "Unicamente se toma los días martes desde las 6 am a 9 am, con ayuno minimo de 8 horas a un maximo de 12 horas",
    "resultado": "8 a 20 días",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): HORMONA ADRENOCORTICOTROPICA ACTH"
  },
  {
    "id": "lab-xl-anticuerpos-clamidia-igm",
    "tipo": "examen",
    "nombre": "Anticuerpos Para Clamidia Igm",
    "sinonimos": [
      "anticuerpos clamidia igm"
    ],
    "estado": "vigente",
    "precio": 58.5,
    "precioAseguradora": 55.56,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS PARA CLAMIDIA IGM"
  },
  {
    "id": "lab-xl-cultivo-antibiograma-faringeo",
    "tipo": "examen",
    "nombre": "Cultivo Y Antibiograma Faringeo",
    "sinonimos": [
      "cultivo antibiograma faringeo"
    ],
    "estado": "vigente",
    "precio": 35,
    "precioAseguradora": 24.44,
    "preparacion": "El paciente debe presentarse sin realizarse ningún tipo de higiene previa en la boca. Es decir, debe presentarse tal como se levanta, sin lavarse los dientes ni realizarse enjuagues bucales.",
    "resultado": "3 días",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): CULTIVO Y ANTIBIOGRAMA FARINGEO *"
  },
  {
    "id": "lab-xl-b2-microglobulina",
    "tipo": "examen",
    "nombre": "B2 Microglobulina",
    "sinonimos": [
      "b2 microglobulina"
    ],
    "estado": "vigente",
    "precio": 78.4,
    "precioAseguradora": 74.44,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Si lo realiza por la mañana, los resultados estarían listos por la tarde. Si, por el contrario, se realiza por la tarde, los resultados estarían disponibles a la mañana del siguiente día.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): B2 MICROGLOBULINA"
  },
  {
    "id": "lab-xl-fosfatasa-acida-total",
    "tipo": "examen",
    "nombre": "Fosfatasa Acida Total",
    "sinonimos": [
      "fosfatasa acida total"
    ],
    "estado": "vigente",
    "precio": 50.8,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): FOSFATASA ACIDA TOTAL"
  },
  {
    "id": "lab-xl-complemento-c3",
    "tipo": "examen",
    "nombre": "Complemento C3",
    "sinonimos": [
      "complemento c3"
    ],
    "estado": "vigente",
    "precio": 52.2,
    "precioAseguradora": 49.46,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): COMPLEMENTO C3"
  },
  {
    "id": "lab-xl-complemento-c4",
    "tipo": "examen",
    "nombre": "Complemento C4",
    "sinonimos": [
      "complemento c4"
    ],
    "estado": "vigente",
    "precio": 52.2,
    "precioAseguradora": 49.46,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): COMPLEMENTO C4"
  },
  {
    "id": "lab-xl-anticuerpos-toxoplasmosis-ig",
    "tipo": "examen",
    "nombre": "Anticuerpos Toxoplasmosis Ig \"a\"",
    "sinonimos": [
      "anticuerpos toxoplasmosis ig"
    ],
    "estado": "vigente",
    "precio": 90.2,
    "precioAseguradora": 85.72,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ANTICUERPOS TOXOPLASMOSIS Ig \"A\""
  },
  {
    "id": "lab-xl-creatinina-orina-azar",
    "tipo": "examen",
    "nombre": "Creatinina En Orina Al Azar",
    "sinonimos": [
      "creatinina orina azar"
    ],
    "estado": "vigente",
    "precio": 5.75,
    "precioAseguradora": 6.39,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): CREATININA EN ORINA AL AZAR"
  },
  {
    "id": "lab-xl-acido-urico-orina-azar",
    "tipo": "examen",
    "nombre": "Acido Urico En Orina Al Azar",
    "sinonimos": [
      "acido urico orina azar"
    ],
    "estado": "vigente",
    "precio": 7,
    "precioAseguradora": 6.67,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ACIDO URICO EN ORINA AL AZAR"
  },
  {
    "id": "lab-xl-potasio-orina-azar",
    "tipo": "examen",
    "nombre": "Potasio En Orina Al Azar",
    "sinonimos": [
      "potasio orina azar"
    ],
    "estado": "vigente",
    "precio": 8.2,
    "precioAseguradora": 7.78,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): POTASIO EN ORINA AL AZAR"
  },
  {
    "id": "lab-xl-cloro-orina-azar",
    "tipo": "examen",
    "nombre": "Cloro En Orina Al Azar",
    "sinonimos": [
      "cloro orina azar"
    ],
    "estado": "vigente",
    "precio": 4.5,
    "precioAseguradora": 4.28,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): CLORO EN ORINA AL AZAR"
  },
  {
    "id": "lab-xl-albumina-orina-24-horas",
    "tipo": "examen",
    "nombre": "Albumina En Orina De 24 Horas",
    "sinonimos": [
      "albumina orina 24 horas"
    ],
    "estado": "vigente",
    "precio": 16.1,
    "precioAseguradora": 15.28,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): ALBUMINA EN ORINA DE 24 HORAS"
  },
  {
    "id": "lab-xl-micro-albumina",
    "tipo": "examen",
    "nombre": "Micro Albumina",
    "sinonimos": [
      "micro albumina"
    ],
    "estado": "vigente",
    "precio": 16.1,
    "precioAseguradora": 15.28,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): MICRO ALBUMINA"
  },
  {
    "id": "lab-xl-saturacion-transferrina",
    "tipo": "examen",
    "nombre": "Saturación De Transferrina",
    "sinonimos": [
      "saturacion transferrina"
    ],
    "estado": "vigente",
    "precio": 27,
    "precioAseguradora": 27,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): SATURACIÓN DE TRANSFERRINA"
  },
  {
    "id": "lab-xl-cistatina-c",
    "tipo": "examen",
    "nombre": "Cistatina C",
    "sinonimos": [
      "cistatina c"
    ],
    "estado": "vigente",
    "precio": 60,
    "precioAseguradora": 33.34,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): CISTATINA C"
  },
  {
    "id": "lab-xl-complemento-ch-50",
    "tipo": "examen",
    "nombre": "Complemento Ch-50",
    "sinonimos": [
      "complemento ch 50"
    ],
    "estado": "vigente",
    "precio": 160,
    "precioAseguradora": 73.33,
    "preparacion": "Ayuno",
    "resultado": "De 8 a 22 días, solamente se toma los días lunes hasta las 7:00am",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): COMPLEMENTO CH-50"
  },
  {
    "id": "lab-xl-transglutaminasa-igg",
    "tipo": "examen",
    "nombre": "Transglutaminasa Igg",
    "sinonimos": [
      "transglutaminasa igg"
    ],
    "estado": "vigente",
    "precio": 98.2,
    "precioAseguradora": 98.2,
    "preparacion": "No requiere preparación previa.",
    "resultado": "Unas 3 horas.",
    "fuente": "precios - IA Valeria (Excel del lab, 2026-11-12): TRANSGLUTAMINASA IgG"
  }
];
