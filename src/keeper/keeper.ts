/**
 * KEEPER IA — orquestación del modelo.
 *
 * El modelo vive acá dentro y sólo acá. Lo que puede hacer:
 *   · recibir un contexto ya filtrado por permisos
 *   · clasificar la intención
 *   · PROPONER una resolución (antes de conocer ningún resultado)
 *   · pedirle al motor que ejecute una tirada
 *   · PROPONER mutaciones mediante herramientas tipadas
 *   · narrar
 *
 * Lo que no puede hacer, por construcción: escribir en el estado, generar
 * azar que cuente, ver secretos sellados, asignar IDs, tocar el pasado.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Turn } from '../engine/engine.ts';
import type { Scenario, KeeperBriefing } from '../scenario/types.ts';
import { KEEPER_TOOLS_SORTED } from '../engine/tools.ts';
import { systemPrompt } from './prompt.ts';
import { buildVolatileContext, recentNarrative } from './context.ts';
import { validateNarration, correctionMessage } from './validate.ts';
import type { KeeperEmit, KeeperResult } from './types.ts';
import { accionesDisponibles } from '../scenario/acciones.ts';

export type { KeeperEmit, KeeperResult } from './types.ts';

const MODELS_WITH_MIDCONV_SYSTEM = ['claude-opus-5', 'claude-opus-4-8', 'claude-fable-5', 'claude-mythos-5'];

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

export async function runKeeperTurn(
  turn: Turn,
  scenario: Scenario,
  briefing: KeeperBriefing,
  playerAction: string,
  emit: KeeperEmit,
): Promise<KeeperResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.KEEPER_MODEL?.trim() || 'claude-opus-5';
  const effort = (process.env.KEEPER_EFFORT?.trim() || 'medium') as 'low' | 'medium' | 'high' | 'xhigh' | 'max';

  const volatile = buildVolatileContext(turn.state, scenario, briefing);
  const history = recentNarrative(turn.state);
  const supportsMidConvSystem = MODELS_WITH_MIDCONV_SYSTEM.some((m) => model.startsWith(m));

  // ── Construcción de mensajes ──────────────────────────────────────────────
  // El prefijo estable (tools + system) se cachea con TTL de 1 hora.
  // El estado volátil va al FINAL, después de la acción del jugador: así no
  // invalida nada de lo cacheado. Y como va en un mensaje `role: "system"`,
  // el jugador no puede falsificar autoridad de operador desde su texto libre.
  const messages: Anthropic.MessageParam[] = [...history];
  if (messages.length === 0 || messages[messages.length - 1]!.role !== 'user') {
    messages.push({ role: 'user', content: playerAction });
  } else {
    messages[messages.length - 1] = { role: 'user', content: playerAction };
  }

  if (supportsMidConvSystem) {
    messages.push({ role: 'system', content: volatile } as unknown as Anthropic.MessageParam);
  } else {
    const last = messages[messages.length - 1]!;
    messages[messages.length - 1] = {
      role: 'user',
      content: `${volatile}\n\n---\n\nACCIÓN DEL JUGADOR: ${String(last.content)}`,
    };
  }

  const usage = { inputTokens: 0, cacheRead: 0, cacheWrite: 0, outputTokens: 0 };
  let narration = '';
  const rollsBefore = turn.state.rolls.length;

  // ── Tool loop ─────────────────────────────────────────────────────────────
  const MAX_ITERATIONS = 8;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const stream = client.messages.stream({
      model,
      max_tokens: 4000,
      system: [
        {
          type: 'text',
          text: systemPrompt(),
          // TTL de 1 hora: un jugador puede quedarse 10 minutos pensando frente
          // a una decisión, y con el TTL corto eso reescribe el caché entero.
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ],
      messages,
      tools: KEEPER_TOOLS_SORTED as unknown as Anthropic.Tool[],
      output_config: { effort },
    } as Anthropic.MessageStreamParams);

    let iterationText = '';
    stream.on('text', (delta) => {
      iterationText += delta;
      emit({ kind: 'narration_delta', data: delta });
    });

    const response = await stream.finalMessage();

    usage.inputTokens += response.usage.input_tokens ?? 0;
    usage.outputTokens += response.usage.output_tokens ?? 0;
    usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;

    // Refusal: HTTP 200 con stop_reason 'refusal'. Hay que comprobarlo ANTES
    // de leer content, o el turno sale vacío sin explicación.
    if (response.stop_reason === 'refusal') {
      return {
        narration:
          'El Keeper no puede narrar esta escena tal como quedó planteada. ' +
          'Probá describir la acción de otra manera, o cambiá de rumbo: el mundo sigue donde estaba.',
        // Aun en un rechazo, las acciones disponibles siguen siendo las del
        // estado: el mundo no cambió porque el modelo no quisiera narrar.
        options: accionesDisponibles(turn.state),
        usedModel: true,
        cost: usage,
      };
    }

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (toolUses.length === 0) {
      narration = iterationText.trim();
      break;
    }

    // Ejecutar cada herramienta contra el MOTOR, que valida y decide.
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const outcome = turn.executeTool(tu.name, (tu.input ?? {}) as Record<string, unknown>);
      if (outcome.emit) emit(outcome.emit);
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: outcome.message,
        is_error: !outcome.ok,
      });
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: results });

    if (iterationText.trim()) narration = iterationText.trim();
  }

  // ── Validación de salida ──────────────────────────────────────────────────
  const rollsThisTurn = turn.state.rolls.slice(rollsBefore);
  const issues = validateNarration(narration, rollsThisTurn);
  const hard = issues.filter((i) => i.severity === 'hard');

  if (hard.length > 0 && narration) {
    emit({ kind: 'validator', data: { rejected: true, issues: hard } });
    messages.push({ role: 'assistant', content: narration });
    messages.push({ role: 'user', content: correctionMessage(hard) });

    const retry = await client.messages.create({
      model,
      max_tokens: 2000,
      system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral', ttl: '1h' } }],
      messages,
      output_config: { effort: 'low' },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const retryText = retry.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const retryIssues = validateNarration(retryText, rollsThisTurn).filter((i) => i.severity === 'hard');
    if (retryIssues.length === 0 && retryText) {
      narration = retryText;
      emit({ kind: 'narration_replace', data: narration });
    }
    // Si la segunda pasada también falla, se emite igual el bloque mecánico:
    // el jugador ve la tirada real aunque la prosa haya quedado mal.
  }

  if (!narration) {
    narration = 'Pasa un momento en el que no ocurre nada que valga la pena contar. El patio sigue igual.';
  }

  // Las opciones las calcula el MOTOR desde el estado, igual que en modo motor.
  // El modelo no las inventa: así nunca ofrece algo ya hecho ni algo que el
  // estado no permite todavía.
  return { narration, options: accionesDisponibles(turn.state), usedModel: true, cost: usage };
}
