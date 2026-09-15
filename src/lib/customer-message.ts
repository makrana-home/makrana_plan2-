export const defaultCustomerMessage = `¡Hola, {nombre}! Somos *Makrana*, creamos arte textil con la técnica de macramé.

Te compartimos nuestro catálogo para que conozcas nuestras piezas:
{catalogo}

Este es el brochure: https://makranahomeart.com/brochure

También hacemos *pedidos personalizados*: nos envías tus medidas, eliges los colores y creamos una pieza a tu gusto, especial para tu espacio.

¿Tienes alguna idea en mente? Escríbenos y la hacemos realidad.`;

// Recognize the previous default even when it was saved as an account preference.
export const legacyCustomerMessage = `¡Hola, {nombre}! 😊 Somos *Makrana*, creamos arte textil con la técnica de macramé. 🧶✨

Te compartimos nuestro catálogo para que conozcas nuestras piezas:
📖 {catalogo}

💛 También hacemos *pedidos personalizados*: nos envías tus medidas, eliges los colores y creamos una pieza a tu gusto, especial para tu espacio.

¿Tienes alguna idea en mente? Escríbenos y la hacemos realidad. ✨`;

export function personalizeCustomerMessage(template: string, name: string, origin: string) {
  const values: Record<string, string> = {
    nombre: name.trim() || "cliente",
    catalogo: new URL("/catalogo", origin).href,
  };
  return template.replace(/\{(nombre|catalogo)\}/g, (_, key: string) => values[key]);
}
