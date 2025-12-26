
export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export enum NarratorTone {
  Bedtime = 'Bedtime Story (Gentle & Slow)',
  Dramatic = 'Dramatic (Expressive & Cinematic)',
  Calm = 'Calm & Steady (Audiobook Style)',
  Reflective = 'Reflective & Philosophical',
}

export interface Story {
  id: string;
  title: string;
  content: string;
  description: string;
}

export interface GenerationSettings {
  voice: VoiceName;
  tone: NarratorTone;
  backgroundMusic: string;
}

export interface SavedProject {
  id: string;
  title: string;
  content: string;
  settings: GenerationSettings;
  timestamp: number;
}
