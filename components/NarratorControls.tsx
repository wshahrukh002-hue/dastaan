
import React from 'react';
import { VoiceId, NarratorTone, GenerationSettings, Character } from '../types';
import { BACKGROUND_TRACKS, Icons } from '../constants';
import { voices } from '../voices';

interface NarratorControlsProps {
  settings: GenerationSettings;
  characters: Character[];
  activeCharacter: Character | null;
  onSettingsChange: (settings: GenerationSettings) => void;
  onCharacterSelect: (character: Character) => void;
  onCreateCharacter: () => void;
}

const NarratorControls: React.FC<NarratorControlsProps> = ({ 
  settings, 
  characters, 
  activeCharacter,
  onSettingsChange, 
  onCharacterSelect,
  onCreateCharacter
}) => {
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, voice: e.target.value as VoiceId, characterId: undefined });
  };

  const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, tone: e.target.value as NarratorTone, characterId: undefined });
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, backgroundMusic: e.target.value });
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, audioQuality: parseInt(e.target.value, 10) });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Character Consistency Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Narrator Consistency Profiles</label>
          <button 
            onClick={onCreateCharacter}
            className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 transition-all flex items-center gap-1"
          >
            <span className="text-lg leading-none">+</span> Save Current as Profile
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {characters.map(char => (
            <button
              key={char.id}
              onClick={() => onCharacterSelect(char)}
              className={`px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-2 ${
                activeCharacter?.id === char.id 
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeCharacter?.id === char.id ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
              {char.name}
            </button>
          ))}
          {characters.length === 0 && (
            <div className="text-xs text-slate-500 italic py-2">No custom profiles yet. Save your settings to maintain voice consistency.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-400">Voice Character</label>
          <select 
            value={settings.voice}
            onChange={handleVoiceChange}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            {voices.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-400">MP3 Quality</label>
          <select 
            value={settings.audioQuality}
            onChange={handleQualityChange}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value={24}>24 kbps (Eco)</option>
            <option value={48}>48 kbps (Standard)</option>
            <option value={96}>96 kbps (High)</option>
            <option value={128}>128 kbps (Ultra)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default NarratorControls;
