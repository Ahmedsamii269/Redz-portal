import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface WaveformAudioPlayerProps {
  url: string;
  label?: string;
  title?: string;
  compact?: boolean;
}

export const WaveformAudioPlayer: React.FC<WaveformAudioPlayerProps> = ({
  url,
  label = 'Voice Sample',
  title,
  compact = false
}) => {
  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getDirectAudioUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    const clean = rawUrl.trim();
    const match = clean.match(/(?:vocaroo\.com|voca\.ro)\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://media.vocaroo.com/mp3/${match[1]}`;
    }
    return clean;
  };

  const directMediaUrl = getDirectAudioUrl(url);

  const barsCount = compact ? 16 : 28;
  const bars = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = (hash << 5) - hash + url.charCodeAt(i);
      hash |= 0;
    }
    return Array.from({ length: barsCount }).map((_, i) => {
      const pseudo = Math.abs(Math.sin((i + 1) * 997 + hash));
      return Math.max(20, Math.floor(pseudo * 100));
    });
  }, [url, barsCount]);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackError(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
        setPlaybackError(false);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const onError = () => {
      setIsPlaying(false);
      setPlaybackError(true);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setPlaybackError(false);
      audio.playbackRate = playbackRate;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
        setPlaybackError(true);
        showToast('Inline audio blocked or unavailable. Use the external link icon to open Vocaroo.', 'warning');
      });
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = fraction * audio.duration;
    setProgress(fraction * 100);
  };

  const formatSec = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#1B2234] transition-all ${compact ? 'p-2.5' : 'p-3.5'}`}>
      <audio ref={audioRef} src={directMediaUrl} preload="metadata" />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? 'bg-[#D93A30]' : 'bg-slate-400 dark:bg-slate-500'}`} />
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
            {title || label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={cycleSpeed}
            type="button"
            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white dark:bg-[#0B0F19] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer tabular-nums"
            title="Toggle playback speed (1x, 1.25x, 1.5x, 2x)"
          >
            {playbackRate}x
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title="Open in Vocaroo directly"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Waveform Visualization Bars */}
      <div
        onClick={seek}
        className="h-7 flex items-center justify-between gap-0.5 cursor-pointer py-1 group select-none"
        title="Click to seek"
      >
        {bars.map((barHeight, idx) => {
          const barFraction = idx / bars.length;
          const isPassed = (barFraction * 100) <= progress;

          return (
            <div
              key={idx}
              className="flex-1 flex items-center justify-center h-full"
            >
              <div
                className={`w-full rounded-full transition-all duration-150 ${
                  isPassed
                    ? 'bg-linear-to-t from-[#D93A30] to-[#F87171]'
                    : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-600'
                }`}
                style={{
                  height: `${barHeight}%`,
                  transform: isPlaying && isPassed ? 'scaleY(1.12)' : 'scaleY(1)'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Controls & Timing */}
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-700/70 text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isPlaying
                ? 'bg-[#D93A30] text-white shadow-xs'
                : 'bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-[#D93A30] hover:text-white hover:border-[#D93A30]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
          </button>
          <span>{formatSec(currentTime)} / {duration > 0 ? formatSec(duration) : '--:--'}</span>
        </div>
        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans font-bold flex items-center gap-1">
          {playbackError ? (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Open Link
            </span>
          ) : isPlaying ? (
            'Playing'
          ) : (
            'Ready'
          )}
        </span>
      </div>
    </div>
  );
};
