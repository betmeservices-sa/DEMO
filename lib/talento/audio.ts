// El audio de presentacion: un link de Vocaroo que manda el formulario de
// carreras. Aca solo se entiende el link; la decision sobre el candidato vive
// en decision.ts.

/**
 * El id de un link de Vocaroo, en cualquiera de sus formas:
 * vocaroo.com/ID, voca.ro/ID, vocaroo.com/embed/ID, con o sin https y www.
 */
export function vocarooId(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?(?:vocaroo\.com\/(?:embed\/)?|voca\.ro\/)([A-Za-z0-9]{6,20})\/?(?:[?#].*)?$/i);
  return m ? m[1] : null;
}

export function embedVocaroo(id: string): string {
  return `https://vocaroo.com/embed/${id}?autoplay=0`;
}

export function linkVocaroo(id: string): string {
  return `https://vocaroo.com/${id}`;
}
