
import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  const [bars, setBars] = useState<number[]>(new Array(40).fill(10));

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setBars(bars.map(() => Math.floor(Math.random() * 40) + 5));
      }, 100);
    } else {
      setBars(new Array(40).fill(2));
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex items-end justify-center gap-1 h-12 w-full overflow-hidden">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-indigo-500 rounded-full transition-all duration-100 opacity-70"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
