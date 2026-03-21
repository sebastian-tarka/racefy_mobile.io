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
      let text = `${d.km} kilometers. Pace ${formatPace(d.pace, d.language)} per kilometer.`;
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
      let text = `${d.km} kilometrów. Tempo ${formatPace(d.pace, d.language)} na kilometr.`;
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
      let text = `${d.km} Kilometer. Tempo ${formatPace(d.pace, d.language)} pro Kilometer.`;
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
      let text = `${d.km} kilomètres. Allure ${formatPace(d.pace, d.language)} par kilomètre.`;
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
      let text = `${d.km} kilómetros. Ritmo ${formatPace(d.pace, d.language)} por kilómetro.`;
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
      let text = `${d.km} chilometri. Ritmo ${formatPace(d.pace, d.language)} per chilometro.`;
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
      let text = `${d.km} quilómetros. Ritmo ${formatPace(d.pace, d.language)} por quilómetro.`;
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
