// Un cliente puede vivir en su PROPIO proyecto de Supabase y seguir siendo
// atendido por este panel (el hospital desde el 2026-10-08). Lo que se fija:
// con sus dos variables, sus consultas van a su proyecto con la llave secreta;
// el webhook lo encuentra (si no, su número caería en el cliente del
// interruptor global); y Yali, que es de solo lectura, sigue sin entrar ahí.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface Creado {
  url: string;
  key: string;
  opciones: Record<string, unknown>;
}

const creados: Creado[] = [];

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string, opciones: Record<string, unknown>) => {
    const c = { url, key, opciones };
    creados.push(c);
    return c;
  },
}));

const sb = await import("@/lib/supabase");

const ENV = [
  "SUPABASE_URL__HOSPITAL",
  "SUPABASE_SECRET_KEY__HOSPITAL",
  "YALI_SUPABASE_URL",
  "YALI_SUPABASE_PUBLISHABLE_KEY",
  "YALI_SUPABASE_LECTOR_JWT",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
];
const guardado: Record<string, string | undefined> = {};

function cliente(tenant?: string): Creado {
  return sb.getSupabase(tenant) as unknown as Creado;
}

function urlsDelWebhook(): string[] {
  return (sb.todosLosClientes() as unknown as Creado[]).map((c) => c.url);
}

beforeEach(() => {
  for (const k of ENV) {
    guardado[k] = process.env[k];
    delete process.env[k];
  }
  process.env.SUPABASE_URL = "https://compartido.test";
  process.env.SUPABASE_PUBLISHABLE_KEY = "pub";
  creados.length = 0;
  sb.olvidarClientesSupabase();
});

afterEach(() => {
  for (const k of ENV) {
    if (guardado[k] === undefined) delete process.env[k];
    else process.env[k] = guardado[k];
  }
  sb.olvidarClientesSupabase();
});

describe("un cliente con proyecto propio que este panel atiende", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL__HOSPITAL = "https://cegisa.test";
    process.env.SUPABASE_SECRET_KEY__HOSPITAL = "sb_secret_x";
  });

  it("consulta su proyecto con la llave secreta, en public", () => {
    const c = cliente("hospital");
    expect(c.url).toBe("https://cegisa.test");
    expect(c.key).toBe("sb_secret_x");
    expect((c.opciones.db as { schema: string }).schema).toBe("public");
    expect(c.opciones.global).toBeUndefined();
  });

  it("los demás siguen en el compartido", () => {
    expect(cliente("grupoq").url).toBe("https://compartido.test");
    expect(cliente().url).toBe("https://compartido.test");
  });

  it("figura entre los proyectos propios y entre los que se escriben", () => {
    expect(sb.tenantsConProyectoPropio()).toContain("hospital");
    expect(sb.tenantsConProyectoEscribible()).toEqual(["hospital"]);
    expect((sb.publicoDeProyectoEscribible("hospital") as unknown as Creado).url).toBe("https://cegisa.test");
    expect(sb.publicoDeProyectoEscribible("grupoq")).toBeNull();
  });

  it("el webhook lo recorre: su número tiene que encontrarse", () => {
    const urls = urlsDelWebhook();
    expect(urls).toContain("https://cegisa.test");
    expect(urls).toContain("https://compartido.test");
  });
});

describe("Yali, de solo lectura", () => {
  beforeEach(() => {
    process.env.YALI_SUPABASE_URL = "https://yali.test";
    process.env.YALI_SUPABASE_PUBLISHABLE_KEY = "pub_yali";
    process.env.YALI_SUPABASE_LECTOR_JWT = "jwt_lector";
  });

  it("se lee con el rol lector y NO se escribe ni se recorre en el webhook", () => {
    const c = cliente("yaly");
    expect(c.url).toBe("https://yali.test");
    expect((c.opciones.global as { headers: { Authorization: string } }).headers.Authorization).toBe(
      "Bearer jwt_lector",
    );
    expect(sb.tenantsConProyectoPropio()).toContain("yaly");
    expect(sb.tenantsConProyectoEscribible()).not.toContain("yaly");
    expect(sb.publicoDeProyectoEscribible("yaly")).toBeNull();
    expect(urlsDelWebhook()).not.toContain("https://yali.test");
  });
});

describe("sin variables", () => {
  it("nadie tiene proyecto propio y todo va al compartido", () => {
    expect(sb.tenantsConProyectoPropio()).toEqual([]);
    expect(cliente("hospital").url).toBe("https://compartido.test");
  });
});
