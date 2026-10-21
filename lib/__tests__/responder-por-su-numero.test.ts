// Un cliente con VARIOS numeros tiene que contestar por el numero al que le
// escribieron.
//
// El 2026-10-14 el panel comercial paso de tener un numero a tener cinco (la
// demo de alta en vivo da de alta numeros nuevos ahi). Alguien escribio al
// 2505 4613 recien dado de alta y Sofia contesto desde el 7560 5872, porque el
// envio tomaba el PRIMER numero del cliente, que es un orden arbitrario de la
// base. La respuesta existia, pero caia en un chat que la persona no estaba
// mirando.
import { beforeEach, describe, expect, it } from "vitest";
import { credencialesParaResponder, credencialesWa } from "@/lib/wa-credenciales";
import { guardarConexionWa, olvidarConexionesWa } from "@/lib/wa-conexiones-store";

const COMERCIAL = "comercial";

const VIEJO = {
  tenant: COMERCIAL,
  wabaId: "1604795731330335",
  phoneNumberId: "1344094815455988",
  displayPhone: "+503 7560 5872",
  verifiedName: "MiAgentIA",
  accessToken: "token-de-la-cuenta",
  pin: "000000",
};

const RECIEN_DADO_DE_ALTA = {
  ...VIEJO,
  phoneNumberId: "1321597484376377",
  displayPhone: "+503 2505 4613",
};

describe("con que numero contesta un cliente que tiene varios", () => {
  beforeEach(async () => {
    olvidarConexionesWa();
    await guardarConexionWa(VIEJO);
    await guardarConexionWa(RECIEN_DADO_DE_ALTA);
  });

  it("contesta por el numero al que le escribieron, no por el primero de la lista", async () => {
    const c = await credencialesParaResponder(COMERCIAL, RECIEN_DADO_DE_ALTA.phoneNumberId);
    expect(c?.phoneId).toBe(RECIEN_DADO_DE_ALTA.phoneNumberId);
  });

  it("y si le escriben al numero viejo, contesta por el viejo", async () => {
    const c = await credencialesParaResponder(COMERCIAL, VIEJO.phoneNumberId);
    expect(c?.phoneId).toBe(VIEJO.phoneNumberId);
  });

  it("sin saber a cual llegó, se comporta como antes", async () => {
    const conPista = await credencialesParaResponder(COMERCIAL, null);
    const sinPista = await credencialesWa(COMERCIAL);
    expect(conPista?.phoneId).toBe(sinPista?.phoneId);
  });

  it("un numero que no es de nadie no secuestra la respuesta del cliente", async () => {
    // Si el id no esta en la tabla, se cae al numero del cliente en vez de
    // quedarse sin mandar nada.
    const c = await credencialesParaResponder(COMERCIAL, "9999999999");
    expect(c?.phoneId).toBeDefined();
    expect([VIEJO.phoneNumberId, RECIEN_DADO_DE_ALTA.phoneNumberId]).toContain(c?.phoneId);
  });
});

// El 2026-10-21 el 2505 4610 paso a ser EL numero de MiAgentIA (WhatsApp y
// voz). Lo que no sale como respuesta a un mensaje (la plantilla de "seguimos
// por WhatsApp" despues de una llamada, un chat que abre el panel) tiene que
// salir de ese, no del primero que devuelva la base.
describe("lo que el panel manda por su cuenta sale del numero principal", () => {
  const PRINCIPAL = { ...VIEJO, phoneNumberId: "1370050652861744", displayPhone: "+503 2505 4610" };

  beforeEach(async () => {
    olvidarConexionesWa();
    await guardarConexionWa(VIEJO);
    await guardarConexionWa(RECIEN_DADO_DE_ALTA);
    await guardarConexionWa(PRINCIPAL);
  });

  it("aunque no sea el primero de la lista", async () => {
    const c = await credencialesWa(COMERCIAL);
    expect(c?.phoneId).toBe(PRINCIPAL.phoneNumberId);
  });

  it("sin saber a cual llego un mensaje, tambien contesta por el principal", async () => {
    const c = await credencialesParaResponder(COMERCIAL, null);
    expect(c?.phoneId).toBe(PRINCIPAL.phoneNumberId);
  });
});
