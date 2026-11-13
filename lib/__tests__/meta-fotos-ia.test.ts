import { describe, expect, it } from "vitest";
import { fotosMetaSinContestar } from "@/lib/meta-ai-reply";
import { filasDeConversaciones } from "@/lib/meta-sondeo-messenger";

// 2026-11-13: en Messenger e Instagram a Valeria le llegaba solo "[imagen]".
// Regla del usuario: todo agente lee las imágenes, como en WhatsApp.

describe("fotos de redes para la IA", () => {
  it("toma solo las fotos mandadas después de la última respuesta", () => {
    const sesion = [
      { direction: "in" as const, texto: "[imagen]", adjuntoMiniatura: "https://x/vieja.jpg" },
      { direction: "out" as const, texto: "Recibido" },
      { direction: "in" as const, texto: "Esta es mi orden" },
      { direction: "in" as const, texto: "[imagen]", adjuntoMiniatura: "https://x/orden.jpg" },
      { direction: "in" as const, texto: "[imagen]" }, // sin URL: no se puede bajar
    ];
    expect(fotosMetaSinContestar(sesion)).toEqual([3]);
  });

  it("el sondeo de Messenger guarda la URL de la foto", () => {
    const filas = filasDeConversaciones(
      [
        {
          updated_time: "2026-11-13T10:00:00Z",
          participants: { data: [{ id: "persona", name: "Ana" }, { id: "pagina" }] },
          messages: {
            data: [
              {
                id: "m1",
                created_time: "2026-11-13T10:00:00Z",
                from: { id: "persona" },
                attachments: { data: [{ mime_type: "image/jpeg", image_data: { url: "https://cdn/orden.jpg" } }] },
              },
            ],
          },
        },
      ],
      new Set(["pagina"]),
    );
    expect(filas[0]).toMatchObject({ texto: "[imagen]", imagenUrl: "https://cdn/orden.jpg", direction: "in" });
  });
});
