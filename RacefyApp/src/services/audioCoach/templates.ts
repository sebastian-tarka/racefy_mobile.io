import type { AnnouncementData, AudioCoachLanguage, AudioCoachStyle } from '../../types/audioCoach';

/**
 * Format decimal pace (e.g. 5.5) to "5:30" string
 */
function formatPace(paceDecimal: number): string {
  const minutes = Math.floor(paceDecimal);
  const seconds = Math.round((paceDecimal - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format split delta in seconds to human-readable string
 */
function formatDelta(deltaSeconds: number, language: AudioCoachLanguage): string {
  const absDelta = Math.abs(deltaSeconds);
  const mins = Math.floor(absDelta / 60);
  const secs = absDelta % 60;

  const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}`;

  const labels: Record<AudioCoachLanguage, { faster: string; slower: string }> = {
    en: { faster: 'faster', slower: 'slower' },
    pl: { faster: 'szybciej', slower: 'wolniej' },
    de: { faster: 'schneller', slower: 'langsamer' },
    fr: { faster: 'plus vite', slower: 'plus lent' },
    es: { faster: 'más rápido', slower: 'más lento' },
    it: { faster: 'più veloce', slower: 'più lento' },
    pt: { faster: 'mais rápido', slower: 'mais lento' },
  };

  const label = deltaSeconds < 0 ? labels[language].faster : labels[language].slower;
  return `${timeStr} ${label}`;
}

type TemplateBuilder = (data: AnnouncementData) => string;

const templates: Record<AudioCoachLanguage, Record<AudioCoachStyle, TemplateBuilder>> = {
  en: {
    neutral: (d) => {
      let text = `${d.km} kilometers. Pace ${formatPace(d.pace)} per kilometer.`;
      if (d.heartRate) text += ` Heart rate ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'en')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} K done! You're running ${formatPace(d.pace)} pace. Keep pushing!`;
      if (d.heartRate) text += ` Heart at ${d.heartRate} BPM.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` You're getting faster, ${formatDelta(d.splitDelta, 'en')}!`
          : ` Stay strong, ${formatDelta(d.splitDelta, 'en')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilometer ${d.km}. Current pace is ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` Heart rate ${d.heartRate} beats per minute.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Picking up speed, ${formatDelta(d.splitDelta, 'en')}. Good work.`
          : ` Slowing down ${formatDelta(d.splitDelta, 'en')}. Try to maintain your pace.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} K. ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` ${d.heartRate} BPM.`;
      return text;
    },
  },
  pl: {
    neutral: (d) => {
      let text = `${d.km} kilometrów. Tempo ${formatPace(d.pace)} na kilometr.`;
      if (d.heartRate) text += ` Tętno ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'pl')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km za tobą! Tempo ${formatPace(d.pace)}. Tak trzymaj!`;
      if (d.heartRate) text += ` Tętno ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Przyspieszasz, ${formatDelta(d.splitDelta, 'pl')}!`
          : ` Nie poddawaj się, ${formatDelta(d.splitDelta, 'pl')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilometr ${d.km}. Aktualne tempo ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` Tętno ${d.heartRate} uderzeń na minutę.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Przyspieszasz o ${formatDelta(d.splitDelta, 'pl')}. Dobrze.`
          : ` Zwalniasz o ${formatDelta(d.splitDelta, 'pl')}. Utrzymaj tempo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  de: {
    neutral: (d) => {
      let text = `${d.km} Kilometer. Tempo ${formatPace(d.pace)} pro Kilometer.`;
      if (d.heartRate) text += ` Herzfrequenz ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'de')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km geschafft! Tempo ${formatPace(d.pace)}. Weiter so!`;
      if (d.heartRate) text += ` Puls ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Du wirst schneller, ${formatDelta(d.splitDelta, 'de')}!`
          : ` Bleib dran, ${formatDelta(d.splitDelta, 'de')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilometer ${d.km}. Aktuelles Tempo ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` Herzfrequenz ${d.heartRate} Schläge pro Minute.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Tempo erhöht, ${formatDelta(d.splitDelta, 'de')}.`
          : ` Tempo verlangsamt, ${formatDelta(d.splitDelta, 'de')}. Versuche das Tempo zu halten.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  fr: {
    neutral: (d) => {
      let text = `${d.km} kilomètres. Allure ${formatPace(d.pace)} par kilomètre.`;
      if (d.heartRate) text += ` Fréquence cardiaque ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'fr')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Allure ${formatPace(d.pace)}. Continue comme ça!`;
      if (d.heartRate) text += ` Cœur à ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Tu accélères, ${formatDelta(d.splitDelta, 'fr')}!`
          : ` Tiens bon, ${formatDelta(d.splitDelta, 'fr')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilomètre ${d.km}. Allure actuelle ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` Fréquence cardiaque ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Accélération de ${formatDelta(d.splitDelta, 'fr')}.`
          : ` Ralentissement de ${formatDelta(d.splitDelta, 'fr')}. Maintenez votre allure.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  es: {
    neutral: (d) => {
      let text = `${d.km} kilómetros. Ritmo ${formatPace(d.pace)} por kilómetro.`;
      if (d.heartRate) text += ` Frecuencia cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'es')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Ritmo ${formatPace(d.pace)}. ¡Sigue así!`;
      if (d.heartRate) text += ` Corazón a ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Estás acelerando, ${formatDelta(d.splitDelta, 'es')}!`
          : ` Aguanta, ${formatDelta(d.splitDelta, 'es')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Kilómetro ${d.km}. Ritmo actual ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` Frecuencia cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Acelerando ${formatDelta(d.splitDelta, 'es')}.`
          : ` Desacelerando ${formatDelta(d.splitDelta, 'es')}. Mantén el ritmo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  it: {
    neutral: (d) => {
      let text = `${d.km} chilometri. Ritmo ${formatPace(d.pace)} per chilometro.`;
      if (d.heartRate) text += ` Frequenza cardiaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'it')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Ritmo ${formatPace(d.pace)}. Continua così!`;
      if (d.heartRate) text += ` Cuore a ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Stai accelerando, ${formatDelta(d.splitDelta, 'it')}!`
          : ` Resisti, ${formatDelta(d.splitDelta, 'it')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Chilometro ${d.km}. Ritmo attuale ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` Frequenza cardiaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Accelerazione di ${formatDelta(d.splitDelta, 'it')}.`
          : ` Rallentamento di ${formatDelta(d.splitDelta, 'it')}. Mantieni il ritmo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` ${d.heartRate}.`;
      return text;
    },
  },
  pt: {
    neutral: (d) => {
      let text = `${d.km} quilómetros. Ritmo ${formatPace(d.pace)} por quilómetro.`;
      if (d.heartRate) text += ` Frequência cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) text += ` ${formatDelta(d.splitDelta, 'pt')}.`;
      return text;
    },
    motivational: (d) => {
      let text = `${d.km} km! Ritmo ${formatPace(d.pace)}. Continue assim!`;
      if (d.heartRate) text += ` Coração a ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Você está acelerando, ${formatDelta(d.splitDelta, 'pt')}!`
          : ` Aguente firme, ${formatDelta(d.splitDelta, 'pt')}.`;
      }
      return text;
    },
    coach: (d) => {
      let text = `Quilómetro ${d.km}. Ritmo atual ${formatPace(d.pace)}.`;
      if (d.heartRate) text += ` Frequência cardíaca ${d.heartRate}.`;
      if (d.splitDelta !== undefined) {
        text += d.splitDelta < 0
          ? ` Acelerando ${formatDelta(d.splitDelta, 'pt')}.`
          : ` Desacelerando ${formatDelta(d.splitDelta, 'pt')}. Mantenha o ritmo.`;
      }
      return text;
    },
    minimal: (d) => {
      let text = `${d.km} km. ${formatPace(d.pace)}.`;
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
