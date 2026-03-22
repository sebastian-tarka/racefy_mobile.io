import type { AnnouncementData, AudioCoachLanguage, AudioCoachStyle } from '../../types/audioCoach';

// ─── Pluralization helpers ───────────────────────────────────────────────────

type PluralForms = {
  one: string;   // nominative singular (n = 1)
  few?: string;  // 2–4 (Slavic languages)
  many: string;  // 5+ (also used as simple plural for non-Slavic)
};

/**
 * Returns the correct plural form for a given count.
 * Handles both simple (one/many) and Slavic (one/few/many) grammars.
 */
function plur(n: number, f: PluralForms): string {
  if (f.few !== undefined) {
    // Polish plural rule: 1 → one; 2-4 (not 12-14) → few; rest → many
    if (n === 1) return f.one;
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return f.few;
    return f.many;
  }
  return n === 1 ? f.one : f.many;
}

type LangTimeForms = { min: PluralForms; sec: PluralForms };

/** Genitive forms — used for "X minutes Y seconds" in pace context */
const PACE_FORMS: Record<AudioCoachLanguage, LangTimeForms> = {
  en: { min: { one: 'minute',  many: 'minutes'  }, sec: { one: 'second',  many: 'seconds'  } },
  pl: { min: { one: 'minuta',  few: 'minuty',  many: 'minut'  }, sec: { one: 'sekunda',  few: 'sekundy',  many: 'sekund'  } },
  de: { min: { one: 'Minute',  many: 'Minuten' }, sec: { one: 'Sekunde', many: 'Sekunden' } },
  fr: { min: { one: 'minute',  many: 'minutes'  }, sec: { one: 'seconde', many: 'secondes' } },
  es: { min: { one: 'minuto',  many: 'minutos'  }, sec: { one: 'segundo', many: 'segundos' } },
  it: { min: { one: 'minuto',  many: 'minuti'   }, sec: { one: 'secondo', many: 'secondi'  } },
  pt: { min: { one: 'minuto',  many: 'minutos'  }, sec: { one: 'segundo', many: 'segundos' } },
};

/** Accusative/object forms — used for "X minutes faster" in delta context (Polish differs here) */
const DELTA_FORMS: Record<AudioCoachLanguage, LangTimeForms> = {
  ...PACE_FORMS,
  pl: { min: { one: 'minutę', few: 'minuty', many: 'minut' }, sec: PACE_FORMS.pl.sec },
};

// ─── Kilometer forms per language ────────────────────────────────────────────

const KM_FORMS: Record<AudioCoachLanguage, PluralForms> = {
  en: { one: 'kilometer',   many: 'kilometers'   },
  pl: { one: 'kilometr',    few: 'kilometry',    many: 'kilometrów' },
  de: { one: 'Kilometer',   many: 'Kilometer'    },
  fr: { one: 'kilomètre',   many: 'kilomètres'   },
  es: { one: 'kilómetro',   many: 'kilómetros'   },
  it: { one: 'chilometro',  many: 'chilometri'   },
  pt: { one: 'quilómetro',  many: 'quilómetros'  },
};

/**
 * Format km value with correct plural form per language.
 * Non-integers (0.5, 1.5, …) always use plural (many) form.
 */
function formatKm(km: number, language: AudioCoachLanguage): string {
  const f = KM_FORMS[language] ?? KM_FORMS.en;
  if (km % 1 !== 0) return `${km} ${f.many}`;
  return `${km} ${plur(km, f)}`;
}

// ─── Formatters ──────────────────────────────────────────────────────────────

/**
 * Format decimal pace (e.g. 5.5) to spoken text per language.
 * Avoids "5:30" which TTS reads as a clock time (e.g. "piąta trzydzieści" in Polish).
 *
 * Examples:
 *   pl, 5.5  → "5 minut 30 sekund"
 *   pl, 6.0  → "6 minut"
 *   en, 5.5  → "5 minutes 30 seconds"
 *   en, 1.25 → "1 minute 15 seconds"
 */
function formatPace(paceDecimal: number, language: AudioCoachLanguage = 'en'): string {
  const minutes = Math.floor(paceDecimal);
  const seconds = Math.round((paceDecimal - minutes) * 60);
  const f = PACE_FORMS[language] ?? PACE_FORMS.en;

  if (seconds === 0) {
    return `${minutes} ${plur(minutes, f.min)}`;
  }
  return `${minutes} ${plur(minutes, f.min)} ${seconds} ${plur(seconds, f.sec)}`;
}

/**
 * Format split delta in seconds to spoken text per language.
 * Avoids "1:30" which TTS reads as a clock time.
 *
 * Examples:
 *   pl, -90s → "1 minutę 30 sekund szybciej"
 *   en, +45s → "45 seconds slower"
 */
function formatDelta(deltaSeconds: number, language: AudioCoachLanguage): string {
  const absDelta = Math.abs(deltaSeconds);
  const mins = Math.floor(absDelta / 60);
  const secs = absDelta % 60;
  const f = DELTA_FORMS[language] ?? DELTA_FORMS.en;

  let timeStr: string;
  if (mins > 0 && secs > 0) {
    timeStr = `${mins} ${plur(mins, f.min)} ${secs} ${plur(secs, f.sec)}`;
  } else if (mins > 0) {
    timeStr = `${mins} ${plur(mins, f.min)}`;
  } else {
    timeStr = `${secs} ${plur(secs, f.sec)}`;
  }

  const dirLabels: Record<AudioCoachLanguage, { faster: string; slower: string }> = {
    en: { faster: 'faster',      slower: 'slower'       },
    pl: { faster: 'szybciej',    slower: 'wolniej'      },
    de: { faster: 'schneller',   slower: 'langsamer'    },
    fr: { faster: 'plus vite',   slower: 'plus lent'    },
    es: { faster: 'más rápido',  slower: 'más lento'    },
    it: { faster: 'più veloce',  slower: 'più lento'    },
    pt: { faster: 'mais rápido', slower: 'mais lento'   },
  };

  const label = deltaSeconds < 0 ? dirLabels[language].faster : dirLabels[language].slower;
  return `${timeStr} ${label}`;
}

type TemplateBuilder = (data: AnnouncementData) => string;

const templates: Record<AudioCoachLanguage, Record<AudioCoachStyle, TemplateBuilder>> = {
  en: {
    neutral: (d) => {
      let text = `${formatKm(d.km, 'en')}. Pace ${formatPace(d.pace, d.language)} per kilometer.`;
      if (d.heartRate) text += ` Heart rate ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'en')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} K done! You're running ${formatPace(d.pace, d.language)} pace. Keep pushing!`;
      if (d.heartRate) text += ` Heart at ${d.heartRate} BPM.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` You're getting faster, ${formatDelta(d.splitDelta, 'en')}!`
          : ` Stay strong, ${formatDelta(d.splitDelta, 'en')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilometer ${d.km}. Current pace is ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` Heart rate ${d.heartRate} beats per minute.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Picking up speed, ${formatDelta(d.splitDelta, 'en')}. Good work.`
          : ` Slowing down ${formatDelta(d.splitDelta, 'en')}. Try to maintain your pace.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} K. ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` ${d.heartRate} BPM.`;
      return text;
    },
  },
  pl: {
    neutral: (d) => {
      let text = `${formatKm(d.km, 'pl')}. Tempo ${formatPace(d.pace, d.language)} na kilometr.`;
      if (d.heartRate) text += ` Tętno ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'pl')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km za tobą! Tempo ${formatPace(d.pace, d.language)}. Tak trzymaj!`;
      if (d.heartRate) text += ` Tętno ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Przyspieszasz, ${formatDelta(d.splitDelta, 'pl')}!`
          : ` Nie poddawaj się, ${formatDelta(d.splitDelta, 'pl')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilometr ${d.km}. Aktualne tempo ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` Tętno ${d.heartRate} uderzeń na minutę.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Przyspieszasz o ${formatDelta(d.splitDelta, 'pl')}. Dobrze.`
          : ` Zwalniasz o ${formatDelta(d.splitDelta, 'pl')}. Utrzymaj tempo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  de: {
    neutral: (d) => {
      let text = `${formatKm(d.km, 'de')}. Tempo ${formatPace(d.pace, d.language)} pro Kilometer.`;
      if (d.heartRate) text += ` Herzfrequenz ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'de')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km geschafft! Tempo ${formatPace(d.pace, d.language)}. Weiter so!`;
      if (d.heartRate) text += ` Puls ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Du wirst schneller, ${formatDelta(d.splitDelta, 'de')}!`
          : ` Bleib dran, ${formatDelta(d.splitDelta, 'de')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilometer ${d.km}. Aktuelles Tempo ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` Herzfrequenz ${d.heartRate} Schläge pro Minute.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Tempo erhöht, ${formatDelta(d.splitDelta, 'de')}.`
          : ` Tempo verlangsamt, ${formatDelta(d.splitDelta, 'de')}. Versuche das Tempo zu halten.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  fr: {
    neutral: (d) => {
      let text = `${formatKm(d.km, 'fr')}. Allure ${formatPace(d.pace, d.language)} par kilomètre.`;
      if (d.heartRate) text += ` Fréquence cardiaque ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'fr')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Allure ${formatPace(d.pace, d.language)}. Continue comme ça!`;
      if (d.heartRate) text += ` Cœur à ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Tu accélères, ${formatDelta(d.splitDelta, 'fr')}!`
          : ` Tiens bon, ${formatDelta(d.splitDelta, 'fr')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilomètre ${d.km}. Allure actuelle ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` Fréquence cardiaque ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Accélération de ${formatDelta(d.splitDelta, 'fr')}.`
          : ` Ralentissement de ${formatDelta(d.splitDelta, 'fr')}. Maintenez votre allure.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  es: {
    neutral: (d) => {
      let text = `${formatKm(d.km, 'es')}. Ritmo ${formatPace(d.pace, d.language)} por kilómetro.`;
      if (d.heartRate) text += ` Frecuencia cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'es')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Ritmo ${formatPace(d.pace, d.language)}. ¡Sigue así!`;
      if (d.heartRate) text += ` Corazón a ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Estás acelerando, ${formatDelta(d.splitDelta, 'es')}!`
          : ` Aguanta, ${formatDelta(d.splitDelta, 'es')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilómetro ${d.km}. Ritmo actual ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` Frecuencia cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Acelerando ${formatDelta(d.splitDelta, 'es')}.`
          : ` Desacelerando ${formatDelta(d.splitDelta, 'es')}. Mantén el ritmo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  it: {
    neutral: (d) => {
      let text = `${formatKm(d.km, 'it')}. Ritmo ${formatPace(d.pace, d.language)} per chilometro.`;
      if (d.heartRate) text += ` Frequenza cardiaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'it')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Ritmo ${formatPace(d.pace, d.language)}. Continua così!`;
      if (d.heartRate) text += ` Cuore a ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Stai accelerando, ${formatDelta(d.splitDelta, 'it')}!`
          : ` Resisti, ${formatDelta(d.splitDelta, 'it')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Chilometro ${d.km}. Ritmo attuale ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` Frequenza cardiaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Accelerazione di ${formatDelta(d.splitDelta, 'it')}.`
          : ` Rallentamento di ${formatDelta(d.splitDelta, 'it')}. Mantieni il ritmo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  pt: {
    neutral: (d) => {
      let text = `${formatKm(d.km, 'pt')}. Ritmo ${formatPace(d.pace, d.language)} por quilómetro.`;
      if (d.heartRate) text += ` Frequência cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'pt')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Ritmo ${formatPace(d.pace, d.language)}. Continue assim!`;
      if (d.heartRate) text += ` Coração a ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Você está acelerando, ${formatDelta(d.splitDelta, 'pt')}!`
          : ` Aguente firme, ${formatDelta(d.splitDelta, 'pt')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Quilómetro ${d.km}. Ritmo atual ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` Frequência cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Acelerando ${formatDelta(d.splitDelta, 'pt')}.`
          : ` Desacelerando ${formatDelta(d.splitDelta, 'pt')}. Mantenha o ritmo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace, d.language)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
};

/**
 * Build announcement text based on language, style, and activity data.
 * Heart rate and split delta are only included when provided (controlled by caller based on tier).
 */
export function buildAnnouncementText(data: AnnouncementData): string {
  const langTemplates = templates[data.language] || templates.en;
  const builder = langTemplates[data.style] || langTemplates.neutral;
  return builder(data);
}

// ─── Start / End / Milestone announcements ──────────────────────────────────

const startTemplates: Record<AudioCoachLanguage, string> = {
  en: 'Run started. Good luck!',
  pl: 'Bieg rozpoczęty. Powodzenia!',
  de: 'Lauf gestartet. Viel Erfolg!',
  fr: 'Course démarrée. Bonne chance!',
  es: '¡Carrera iniciada! ¡Buena suerte!',
  it: 'Corsa iniziata. Buona fortuna!',
  pt: 'Corrida iniciada. Boa sorte!',
};

export function buildStartAnnouncement(language: AudioCoachLanguage): string {
  return startTemplates[language] || startTemplates.en;
}

const endTemplates: Record<AudioCoachLanguage, (km: number, pace: number, lang: AudioCoachLanguage) => string> = {
  en: (km, pace, lang) =>
    `Run complete. ${formatKm(km, 'en')} in ${formatPace(pace, lang)}. Great job!`,
  pl: (km, pace, lang) =>
    `Bieg zakończony. ${formatKm(km, 'pl')}, tempo średnie ${formatPace(pace, lang)} na kilometr. Dobra robota!`,
  de: (km, pace, lang) =>
    `Lauf beendet. ${formatKm(km, 'de')} in ${formatPace(pace, lang)}. Gut gemacht!`,
  fr: (km, pace, lang) =>
    `Course terminée. ${formatKm(km, 'fr')} en ${formatPace(pace, lang)}. Bien joué!`,
  es: (km, pace, lang) =>
    `¡Carrera completada! ${formatKm(km, 'es')} en ${formatPace(pace, lang)}. ¡Buen trabajo!`,
  it: (km, pace, lang) =>
    `Corsa completata. ${formatKm(km, 'it')} in ${formatPace(pace, lang)}. Ottimo lavoro!`,
  pt: (km, pace, lang) =>
    `Corrida concluída. ${formatKm(km, 'pt')} em ${formatPace(pace, lang)}. Bom trabalho!`,
};

export function buildEndAnnouncement(
  language: AudioCoachLanguage,
  totalKm: number,
  avgPaceMinPerKm: number,
): string {
  const builder = endTemplates[language] || endTemplates.en;
  // Round km to 1 decimal
  const km = Math.round(totalKm * 10) / 10;
  return builder(km, avgPaceMinPerKm, language);
}

// Milestone threshold labels (km value → spoken name per language)
const MILESTONE_NAMES: Record<number, Record<AudioCoachLanguage, string>> = {
  5:    { en: '5 K',            pl: '5 kilometrów',         de: '5 Kilometer',       fr: '5 kilomètres',       es: '5 kilómetros',       it: '5 chilometri',       pt: '5 quilómetros' },
  10:   { en: '10 K',           pl: '10 kilometrów',        de: '10 Kilometer',      fr: '10 kilomètres',      es: '10 kilómetros',      it: '10 chilometri',      pt: '10 quilómetros' },
  15:   { en: '15 K',           pl: '15 kilometrów',        de: '15 Kilometer',      fr: '15 kilomètres',      es: '15 kilómetros',      it: '15 chilometri',      pt: '15 quilómetros' },
  21.1: { en: 'half marathon',  pl: 'półmaraton',           de: 'Halbmarathon',      fr: 'semi-marathon',      es: 'media maratón',      it: 'mezza maratona',     pt: 'meia maratona' },
  30:   { en: '30 K',           pl: '30 kilometrów',        de: '30 Kilometer',      fr: '30 kilomètres',      es: '30 kilómetros',      it: '30 chilometri',      pt: '30 quilómetros' },
  42.2: { en: 'marathon',       pl: 'maraton',              de: 'Marathon',          fr: 'marathon',           es: 'maratón',            it: 'maratona',           pt: 'maratona' },
};

const milestoneTemplates: Record<AudioCoachLanguage, (name: string) => string> = {
  en: (name) => `Congratulations! You just completed your first ${name}!`,
  pl: (name) => `Gratulacje! Właśnie ukończyłeś swój pierwszy ${name}!`,
  de: (name) => `Herzlichen Glückwunsch! Du hast deinen ersten ${name} geschafft!`,
  fr: (name) => `Félicitations! Vous venez de compléter votre premier ${name}!`,
  es: (name) => `¡Felicidades! ¡Acabas de completar tu primer ${name}!`,
  it: (name) => `Congratulazioni! Hai appena completato la tua prima ${name}!`,
  pt: (name) => `Parabéns! Você acabou de completar sua primeira ${name}!`,
};

/**
 * Build milestone announcement. Returns null if threshold is not a known milestone.
 */
export function buildMilestoneAnnouncement(
  language: AudioCoachLanguage,
  thresholdKm: number,
): string | null {
  const names = MILESTONE_NAMES[thresholdKm];
  if (!names) return null;
  const name = names[language] || names.en;
  const builder = milestoneTemplates[language] || milestoneTemplates.en;
  return builder(name);
}
