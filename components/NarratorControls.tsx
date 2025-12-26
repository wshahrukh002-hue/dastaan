
import React from 'react';
import { VoiceName, NarratorTone, GenerationSettings } from '../types';
import { BACKGROUND_TRACKS } from '../constants';

interface NarratorControlsProps {
  settings: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
}

const NarratorControls: React.FC<NarratorControlsProps> = ({ settings, onChange }) => {
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, voice: e.target.value as VoiceName });
  };

  const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, tone: e.target.value as NarratorTone });
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, backgroundMusic: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-400">Voice Character</label>
        <select 
          value={settings.voice}
          onChange={handleVoiceChange}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        >
          {Object.values(VoiceName).map(v => (
            <option key={v} value={v}>{v} (Advanced AI)</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-400">Narrator Tone</label>
        <select 
          value={settings.tone}
          onChange={handleToneChange}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        >
          {Object.values(NarratorTone).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-400">Background Music</label>
        <select 
          value={settings.backgroundMusic}
          onChange={handleMusicChange}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        >
          {BACKGROUND_TRACKS.map(track => (
            <option key={track.name} value={track.url}>{track.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default NarratorControls;
