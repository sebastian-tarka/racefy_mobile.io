/**
 * Spoken text for workout cues, in the same seven languages as the audio
 * coach. Kept deliberately short: an athlete hears these mid-effort, over
 * music, often through one earbud.
 */

import type { AudioCoachLanguage } from '../../types/audioCoach';
import type { CompiledSegment, WorkoutGoal } from '../../types/workout';
import type { EngineSnapshot, SegmentRemaining } from './engine';

export type SpokenUnits = 'metric' | 'imperial';

const METERS_PER_MILE = 1609.344;

/** `frac` = form used after a fraction ("2,5 kilometra"); defaults to `few`. */
type Plural = { one: string; few?: string; many: string; frac?: string };

function plural(n: number, forms: Plural, lang: AudioCoachLanguage): string {
  if (lang === 'pl') {
    const isInt = Number.isInteger(n);
    if (!isInt) return forms.frac ?? forms.few ?? forms.many; // "2,5 kilometra"
    if (n === 1) return forms.one;
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms.few ?? forms.many;
    return forms.many;
  }
  return n === 1 ? forms.one : forms.many;
}

const DIST_WORDS: Record<AudioCoachLanguage, { km: Plural; mi: Plural; m: string }> = {
  en: {
    km: { one: 'kilometre', many: 'kilometres' },
    mi: { one: 'mile', many: 'miles' },
    m: 'metres',
  },
  pl: {
    km: { one: 'kilometr', few: 'kilometry', many: 'kilometrów', frac: 'kilometra' },
    mi: { one: 'mila', few: 'mile', many: 'mil', frac: 'mili' },
    m: 'metrów',
  },
  de: {
    km: { one: 'Kilometer', many: 'Kilometer' },
    mi: { one: 'Meile', many: 'Meilen' },
    m: 'Meter',
  },
  fr: {
    km: { one: 'kilomètre', many: 'kilomètres' },
    mi: { one: 'mile', many: 'miles' },
    m: 'mètres',
  },
  es: {
    km: { one: 'kilómetro', many: 'kilómetros' },
    mi: { one: 'milla', many: 'millas' },
    m: 'metros',
  },
  it: {
    km: { one: 'chilometro', many: 'chilometri' },
    mi: { one: 'miglio', many: 'miglia' },
    m: 'metri',
  },
  pt: {
    km: { one: 'quilômetro', many: 'quilômetros' },
    mi: { one: 'milha', many: 'milhas' },
    m: 'metros',
  },
};

const TIME_WORDS: Record<AudioCoachLanguage, { h: Plural; min: Plural; s: Plural }> = {
  en: {
    h: { one: 'hour', many: 'hours' },
    min: { one: 'minute', many: 'minutes' },
    s: { one: 'second', many: 'seconds' },
  },
  pl: {
    h: { one: 'godzina', few: 'godziny', many: 'godzin' },
    min: { one: 'minuta', few: 'minuty', many: 'minut' },
    s: { one: 'sekunda', few: 'sekundy', many: 'sekund' },
  },
  de: {
    h: { one: 'Stunde', many: 'Stunden' },
    min: { one: 'Minute', many: 'Minuten' },
    s: { one: 'Sekunde', many: 'Sekunden' },
  },
  fr: {
    h: { one: 'heure', many: 'heures' },
    min: { one: 'minute', many: 'minutes' },
    s: { one: 'seconde', many: 'secondes' },
  },
  es: {
    h: { one: 'hora', many: 'horas' },
    min: { one: 'minuto', many: 'minutos' },
    s: { one: 'segundo', many: 'segundos' },
  },
  it: {
    h: { one: 'ora', many: 'ore' },
    min: { one: 'minuto', many: 'minuti' },
    s: { one: 'secondo', many: 'secondi' },
  },
  pt: {
    h: { one: 'hora', many: 'horas' },
    min: { one: 'minuto', many: 'minutos' },
    s: { one: 'segundo', many: 'segundos' },
  },
};

const DECIMAL_COMMA: AudioCoachLanguage[] = ['pl', 'de', 'fr', 'es', 'it', 'pt'];

function num(n: number, lang: AudioCoachLanguage): string {
  const s = String(n);
  return DECIMAL_COMMA.includes(lang) ? s.replace('.', ',') : s;
}

/** "5 kilometres", "2,5 kilometra", "800 metres", "3.1 miles". */
export function spokenDistance(
  meters: number,
  lang: AudioCoachLanguage,
  units: SpokenUnits = 'metric',
): string {
  const w = DIST_WORDS[lang] ?? DIST_WORDS.en;
  if (units === 'imperial') {
    const mi = Math.round((meters / METERS_PER_MILE) * 10) / 10;
    return `${num(mi, lang)} ${plural(mi, w.mi, lang)}`;
  }
  if (meters < 1000) {
    const m = Math.max(10, Math.round(meters / 10) * 10);
    return `${m} ${w.m}`;
  }
  const km = meters < 10_000 ? Math.round(meters / 100) / 10 : Math.round(meters / 1000);
  return `${num(km, lang)} ${plural(km, w.km, lang)}`;
}

/** "45 minutes", "1 hour 5 minutes", "30 seconds". Rounds to whole minutes above 90 s. */
export function spokenDuration(seconds: number, lang: AudioCoachLanguage): string {
  const w = TIME_WORDS[lang] ?? TIME_WORDS.en;
  const s = Math.round(seconds);
  if (s < 90) return `${s} ${plural(s, w.s, lang)}`;
  const totalMin = Math.round(s / 60);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${plural(h, w.h, lang)}`);
  if (min > 0 || h === 0) parts.push(`${min} ${plural(min, w.min, lang)}`);
  return parts.join(' ');
}

export function spokenRemaining(
  remaining: SegmentRemaining,
  lang: AudioCoachLanguage,
  units: SpokenUnits,
): string {
  return remaining.type === 'time'
    ? spokenDuration(remaining.seconds, lang)
    : spokenDistance(remaining.meters, lang, units);
}

export function spokenGoal(
  goal: WorkoutGoal,
  lang: AudioCoachLanguage,
  units: SpokenUnits,
): string {
  return goal.type === 'time'
    ? spokenDuration(goal.seconds, lang)
    : spokenDistance(goal.meters, lang, units);
}

// ── Sentences ───────────────────────────────────────────────────────────────

const HALFWAY: Record<AudioCoachLanguage, (remaining: string) => string> = {
  en: (r) => `Halfway there. ${r} to go.`,
  pl: (r) => `Połowa za Tobą. Zostało ${r}.`,
  de: (r) => `Halbzeit. Noch ${r}.`,
  fr: (r) => `À mi-chemin. Encore ${r}.`,
  es: (r) => `A mitad de camino. Quedan ${r}.`,
  it: (r) => `A metà strada. Mancano ${r}.`,
  pt: (r) => `Metade do caminho. Faltam ${r}.`,
};

export function buildHalfwayText(
  remaining: SegmentRemaining,
  lang: AudioCoachLanguage,
  units: SpokenUnits,
): string {
  return (HALFWAY[lang] ?? HALFWAY.en)(spokenRemaining(remaining, lang, units));
}

/**
 * Goal reached. A distance goal reports the time it took; a time goal reports
 * the distance covered. Explicitly tells the athlete the recording continues —
 * we never auto-stop, and a runner who expected a stop would otherwise wonder.
 */
const GOAL_REACHED: Record<
  AudioCoachLanguage,
  (goal: string, other: string, goalType: WorkoutGoal['type']) => string
> = {
  en: (g, o, t) =>
    t === 'distance'
      ? `Goal reached: ${g} in ${o}. Great work — the recording continues.`
      : `Goal reached: ${g}, ${o} covered. Great work — the recording continues.`,
  pl: (g, o, t) =>
    t === 'distance'
      ? `Cel osiągnięty: ${g} w ${o}. Świetna robota, nagrywanie trwa dalej.`
      : `Cel osiągnięty: ${g}, pokonane ${o}. Świetna robota, nagrywanie trwa dalej.`,
  de: (g, o, t) =>
    t === 'distance'
      ? `Ziel erreicht: ${g} in ${o}. Stark — die Aufzeichnung läuft weiter.`
      : `Ziel erreicht: ${g}, ${o} zurückgelegt. Stark — die Aufzeichnung läuft weiter.`,
  fr: (g, o, t) =>
    t === 'distance'
      ? `Objectif atteint : ${g} en ${o}. Bravo, l'enregistrement continue.`
      : `Objectif atteint : ${g}, ${o} parcourus. Bravo, l'enregistrement continue.`,
  es: (g, o, t) =>
    t === 'distance'
      ? `Objetivo alcanzado: ${g} en ${o}. Buen trabajo, la grabación continúa.`
      : `Objetivo alcanzado: ${g}, ${o} recorridos. Buen trabajo, la grabación continúa.`,
  it: (g, o, t) =>
    t === 'distance'
      ? `Obiettivo raggiunto: ${g} in ${o}. Ottimo, la registrazione continua.`
      : `Obiettivo raggiunto: ${g}, ${o} percorsi. Ottimo, la registrazione continua.`,
  pt: (g, o, t) =>
    t === 'distance'
      ? `Meta alcançada: ${g} em ${o}. Bom trabalho, a gravação continua.`
      : `Meta alcançada: ${g}, ${o} percorridos. Bom trabalho, a gravação continua.`,
};

export function buildGoalReachedText(
  goal: WorkoutGoal,
  at: EngineSnapshot,
  lang: AudioCoachLanguage,
  units: SpokenUnits,
): string {
  const g = spokenGoal(goal, lang, units);
  const other =
    goal.type === 'distance'
      ? spokenDuration(at.activeSeconds, lang)
      : spokenDistance(at.distanceM, lang, units);
  return (GOAL_REACHED[lang] ?? GOAL_REACHED.en)(g, other, goal.type);
}

// ── Interval segments (used from phase 2 on; kept here so the voice stays in one file) ──

const KIND_WORDS: Record<AudioCoachLanguage, Record<CompiledSegment['kind'], string>> = {
  en: { warmup: 'warm-up', work: 'work', recovery: 'recovery', cooldown: 'cool-down' },
  pl: { warmup: 'rozgrzewka', work: 'praca', recovery: 'odpoczynek', cooldown: 'schłodzenie' },
  de: { warmup: 'Aufwärmen', work: 'Belastung', recovery: 'Erholung', cooldown: 'Auslaufen' },
  fr: {
    warmup: 'échauffement',
    work: 'effort',
    recovery: 'récupération',
    cooldown: 'retour au calme',
  },
  es: {
    warmup: 'calentamiento',
    work: 'esfuerzo',
    recovery: 'recuperación',
    cooldown: 'enfriamiento',
  },
  it: { warmup: 'riscaldamento', work: 'lavoro', recovery: 'recupero', cooldown: 'defaticamento' },
  pt: {
    warmup: 'aquecimento',
    work: 'esforço',
    recovery: 'recuperação',
    cooldown: 'desaquecimento',
  },
};

const OF: Record<AudioCoachLanguage, string> = {
  en: 'of',
  pl: 'z',
  de: 'von',
  fr: 'sur',
  es: 'de',
  it: 'di',
  pt: 'de',
};

/** "Work 3 of 6: 400 metres." / "Recovery: 2 minutes." / "Cool-down." */
export function buildSegmentStartText(
  segment: CompiledSegment,
  lang: AudioCoachLanguage,
  units: SpokenUnits,
): string {
  const kind = (KIND_WORDS[lang] ?? KIND_WORDS.en)[segment.kind];
  const label = segment.repeatLabel
    ? `${kind} ${segment.repeatLabel.current} ${OF[lang] ?? OF.en} ${segment.repeatLabel.total}`
    : kind;
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  if (segment.end.type === 'open') return `${cap}.`;
  const length =
    segment.end.type === 'time'
      ? spokenDuration(segment.end.seconds, lang)
      : spokenDistance(segment.end.meters, lang, units);
  return `${cap}: ${length}.`;
}

const APPROACH: Record<AudioCoachLanguage, (dist: string, next: string) => string> = {
  en: (d, n) => `In ${d}: ${n}.`,
  pl: (d, n) => `Za ${d}: ${n}.`,
  de: (d, n) => `In ${d}: ${n}.`,
  fr: (d, n) => `Dans ${d} : ${n}.`,
  es: (d, n) => `En ${d}: ${n}.`,
  it: (d, n) => `Tra ${d}: ${n}.`,
  pt: (d, n) => `Em ${d}: ${n}.`,
};

export function buildApproachText(
  metersLeft: number,
  next: CompiledSegment,
  lang: AudioCoachLanguage,
  units: SpokenUnits,
): string {
  const kind = (KIND_WORDS[lang] ?? KIND_WORDS.en)[next.kind];
  return (APPROACH[lang] ?? APPROACH.en)(spokenDistance(metersLeft, lang, units), kind);
}

const COMPLETE: Record<AudioCoachLanguage, string> = {
  en: 'Workout complete. Great work — the recording continues.',
  pl: 'Trening ukończony. Świetna robota, nagrywanie trwa dalej.',
  de: 'Training abgeschlossen. Stark — die Aufzeichnung läuft weiter.',
  fr: "Séance terminée. Bravo, l'enregistrement continue.",
  es: 'Entrenamiento completado. Buen trabajo, la grabación continúa.',
  it: 'Allenamento completato. Ottimo, la registrazione continua.',
  pt: 'Treino concluído. Bom trabalho, a gravação continua.',
};

export function buildWorkoutCompleteText(lang: AudioCoachLanguage): string {
  return COMPLETE[lang] ?? COMPLETE.en;
}
