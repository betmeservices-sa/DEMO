// Las llamadas a Meta y a Vapi para dar de alta un número. Nada de UI.
//
// Los cuatro pasos de la Cloud API son los de siempre: agregar el número a la
// cuenta, pedir el código, verificarlo y registrar. Lo único fuera de lo común
// es pedir el código por VOZ en vez de SMS, porque del otro lado de la línea no
// hay una persona con un teléfono: hay un agente de voz esperando la llamada.

const GRAFO = "https://graph.facebook.com/v23.0";

export interface CredsAlta {
  token: string;
  wabaId: string;
  /** El PIN de verificación en dos pasos que se le fija al número al registrarlo. */
  pin: string;
}

async function meta<T>(
  ruta: string,
  token: string,
  init?: { metodo?: string; cuerpo?: unknown },
): Promise<T> {
  const r = await fetch(`${GRAFO}${ruta}`, {
    method: init?.metodo ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.cuerpo ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.cuerpo ? JSON.stringify(init.cuerpo) : undefined,
    cache: "no-store",
  });
  const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok || d.error) {
    const e = d.error as { message?: string } | undefined;
    throw new Error(e?.message ?? `Meta respondió ${r.status}`);
  }
  return d as T;
}

/** Los números que ya están en la cuenta de WhatsApp. Un número ya dado de alta no se repite. */
export async function numerosEnWhatsApp(c: CredsAlta): Promise<string[]> {
  const d = await meta<{ data?: { display_phone_number?: string }[] }>(
    `/${c.wabaId}/phone_numbers?fields=display_phone_number&limit=100`,
    c.token,
  );
  return (d.data ?? []).map((n) => n.display_phone_number ?? "").filter(Boolean);
}

/** Paso 1: agrega el número a la cuenta y devuelve el id que le dio Meta. */
export async function altaEnMeta(c: CredsAlta, e164: string, nombre: string): Promise<string> {
  const digitos = e164.replace(/\D/g, "");
  const d = await meta<{ id: string }>(`/${c.wabaId}/phone_numbers`, c.token, {
    metodo: "POST",
    cuerpo: { cc: digitos.slice(0, 3), phone_number: digitos.slice(3), verified_name: nombre },
  });
  if (!d.id) throw new Error("Meta no devolvió el id del número.");
  return d.id;
}

/**
 * Paso 2: que Meta llame y dicte el código.
 *
 * `code_method: VOICE` es la pieza que hace posible la demo. Con SMS el código
 * llegaría a un teléfono que nadie está mirando; por voz entra a la línea donde
 * está el agente.
 */
export async function pedirCodigoPorLlamada(c: CredsAlta, phoneNumberId: string): Promise<void> {
  await meta(`/${phoneNumberId}/request_code`, c.token, {
    metodo: "POST",
    cuerpo: { code_method: "VOICE", language: "es_ES" },
  });
}

/** Paso 3. */
export async function verificarCodigo(c: CredsAlta, phoneNumberId: string, codigo: string): Promise<void> {
  await meta(`/${phoneNumberId}/verify_code`, c.token, {
    metodo: "POST",
    cuerpo: { code: codigo },
  });
}

/** Paso 4: queda como remitente de la Cloud API. */
export async function registrarNumero(c: CredsAlta, phoneNumberId: string): Promise<void> {
  await meta(`/${phoneNumberId}/register`, c.token, {
    metodo: "POST",
    cuerpo: { messaging_product: "whatsapp", pin: c.pin },
  });
}

export interface EstadoNumeroMeta {
  status: string;
  codeVerificationStatus: string;
  platformType: string;
  displayPhoneNumber: string;
}

export async function estadoDelNumero(c: CredsAlta, phoneNumberId: string): Promise<EstadoNumeroMeta> {
  const d = await meta<Record<string, string>>(
    `/${phoneNumberId}?fields=status,code_verification_status,platform_type,display_phone_number`,
    c.token,
  );
  return {
    status: d.status ?? "",
    codeVerificationStatus: d.code_verification_status ?? "",
    platformType: d.platform_type ?? "",
    displayPhoneNumber: d.display_phone_number ?? "",
  };
}

/**
 * Las líneas que están listas en Vapi con el agente verificador colgado.
 *
 * Esto es la comprobación que pidió el usuario: la llamada de Meta solo se pide
 * para una línea que ya sabemos que recibe llamadas y tiene quién contestarlas.
 * Sin `VAPI_PRIVATE_KEY` devuelve lista vacía, y entonces la pantalla no ofrece
 * ninguna línea en vez de arriesgar una corrida a ciegas.
 */
export async function lineasListasEnVapi(assistantId: string): Promise<string[]> {
  const key = process.env.VAPI_PRIVATE_KEY;
  if (!key) return [];
  const r = await fetch("https://api.vapi.ai/phone-number?limit=100", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const d = (await r.json()) as { number?: string; assistantId?: string; status?: string }[];
  return (Array.isArray(d) ? d : [])
    .filter((n) => n.assistantId === assistantId && n.status !== "deleted" && n.number)
    .map((n) => n.number as string);
}
