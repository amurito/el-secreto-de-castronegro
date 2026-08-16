/**
 * TRADUCE UNA CRISIS DECLARADA A LOS ARGUMENTOS PLANOS DE `apply_sanity_loss`.
 *
 * El contenido declara la fobia o manía como un objeto —`nombre`,
 * `descripcion`, `afecta: [{skill, dados}]`— porque así se escribe cómodo en
 * TypeScript. La herramienta del motor recibe argumentos planos, como
 * cualquier otra: es el mismo contrato que usa el resto del proyecto para el
 * límite entre contenido y motor. Esta función es la única que cruza ese
 * límite para las crisis, así que sólo existe una vez.
 */

interface CrisisDeclarada {
  nombre: string;
  descripcion: string;
  tipo?: 'phobia' | 'mania';
  afecta: Array<{ skill: string; dados: number }>;
}

export function argsDeCrisis(crisis: CrisisDeclarada | undefined): Record<string, unknown> {
  if (!crisis) return {};
  const out: Record<string, unknown> = {
    crisis_name: crisis.nombre,
    crisis_description: crisis.descripcion,
    crisis_kind: crisis.tipo ?? 'phobia',
  };
  // Sólo las dos primeras: `apply_sanity_loss` acepta como mucho dos
  // habilidades afectadas por crisis, que ya alcanza para cualquier fobia o
  // manía razonable sin que el contrato de la herramienta crezca sin límite.
  crisis.afecta.slice(0, 2).forEach((a, n) => {
    out[`crisis_skill_${n + 1}`] = a.skill;
    out[`crisis_dice_${n + 1}`] = a.dados;
  });
  return out;
}
