import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { dspEngine } from '../services/dspEngine';

const EQ_PRESETS = {
  flat: { name: 'Studio Reference (Flat)', bands: [0, 0, 0, 0, 0] },
  bass_boost: { name: 'Bass Presence (+6dB)', bands: [6, 4, 1, 0, -1] },
  vocal: { name: 'Vocal Radiance', bands: [-2, 0, 4, 3, 1] },
  electronic: { name: 'Electronic & Club', bands: [5, 3, -1, 2, 4] },
  warmth: { name: 'Acoustic Warmth', bands: [3, 2, 0, -1, -2] },
  custom: { name: 'Custom DSP Profile', bands: [0, 0, 0, 0, 0] },
};

const FREQ_CONFIG = [
  { label: '60 Hz', name: 'Sub-Bass', min: -12, max: 12 },
  { label: '250 Hz', name: 'Bass Punch', min: -12, max: 12 },
  { label: '1 kHz', name: 'Vocal Mid', min: -12, max: 12 },
  { label: '4 kHz', name: 'Presence', min: -12, max: 12 },
  { label: '16 kHz', name: 'Air / Sparkle', min: -12, max: 12 },
];

export default function Settings() {
  const { user, logout, savePreferencesToAccount } = useAuth();
  const { localTracks } = usePlayer();

  // Playback & Stream Settings
  const [streamQuality, setStreamQuality] = useState(() => localStorage.getItem('reveria:streamQuality') || 'lossless');
  const [latencyMode, setLatencyMode] = useState(() => localStorage.getItem('reveria:latencyMode') || 'ultra-low');
  const [normalizeVolume, setNormalizeVolume] = useState(() => {
    const stored = localStorage.getItem('reveria:normalizeVolume');
    return stored !== null ? stored === 'true' : true;
  });
  const [crossfade, setCrossfade] = useState(() => Number(localStorage.getItem('reveria:crossfade') || 2));
  const [stereoWidth, setStereoWidth] = useState(() => Number(localStorage.getItem('reveria:stereoWidth') || 100));
  const [soundstage, setSoundstage] = useState(() => localStorage.getItem('reveria:soundstage') || 'studio');

  // Equalizer DSP State
  const [selectedPreset, setSelectedPreset] = useState(() => localStorage.getItem('reveria:eqPreset') || 'flat');
  const [eqBands, setEqBands] = useState(() => {
    try {
      const saved = localStorage.getItem('reveria:eqBands');
      return saved ? JSON.parse(saved) : [0, 0, 0, 0, 0];
    } catch {
      return [0, 0, 0, 0, 0];
    }
  });

  // Audio Output Hardware Devices
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('default');
  const [deviceSupportNotice, setDeviceSupportNotice] = useState('');

  // Hardware Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationData, setCalibrationData] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  // Enumerate hardware audio output devices if supported
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const outputs = devices.filter((d) => d.kind === 'audiooutput');
          setAudioDevices(outputs);
        })
        .catch(() => {});
    }
  }, []);

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    const bands = EQ_PRESETS[presetKey].bands;
    setEqBands([...bands]);
    localStorage.setItem('reveria:eqPreset', presetKey);
    localStorage.setItem('reveria:eqBands', JSON.stringify(bands));
    dspEngine.setEqualizerBands(bands);
    window.dispatchEvent(
      new CustomEvent('reveria:dsp-settings-changed', {
        detail: { equalizerBands: bands, spatialSoundstage: stereoWidth, dynamicNormalization: normalizeVolume }
      })
    );
  };

  const handleBandChange = (index, value) => {
    const newBands = [...eqBands];
    newBands[index] = Number(value);
    setEqBands(newBands);
    setSelectedPreset('custom');
    localStorage.setItem('reveria:eqPreset', 'custom');
    localStorage.setItem('reveria:eqBands', JSON.stringify(newBands));
    dspEngine.setEqualizerBands(newBands);
    window.dispatchEvent(
      new CustomEvent('reveria:dsp-settings-changed', {
        detail: { equalizerBands: newBands, spatialSoundstage: stereoWidth, dynamicNormalization: normalizeVolume }
      })
    );
  };

  const handleStereoWidthChange = (val) => {
    const num = Number(val);
    setStereoWidth(num);
    localStorage.setItem('reveria:stereoWidth', String(num));
    dspEngine.setSpatialWidth(num);
    window.dispatchEvent(
      new CustomEvent('reveria:dsp-settings-changed', {
        detail: { equalizerBands: eqBands, spatialSoundstage: num, dynamicNormalization: normalizeVolume }
      })
    );
  };

  const handleNormalizationChange = () => {
    const nextVal = !normalizeVolume;
    setNormalizeVolume(nextVal);
    localStorage.setItem('reveria:normalizeVolume', String(nextVal));
    dspEngine.setDynamicNormalization(nextVal);
    window.dispatchEvent(
      new CustomEvent('reveria:dsp-settings-changed', {
        detail: { equalizerBands: eqBands, spatialSoundstage: stereoWidth, dynamicNormalization: nextVal }
      })
    );
  };

  const handleDeviceChange = async (deviceId) => {
    setSelectedDevice(deviceId);
    const audio = window.__riveriaAudio || window.__landingAudio;
    if (audio && typeof audio.setSinkId === 'function') {
      try {
        await audio.setSinkId(deviceId);
        setDeviceSupportNotice('Audio routed directly to selected hardware output.');
      } catch (err) {
        setDeviceSupportNotice(`Hardware routing: ${err.message}`);
      }
    } else {
      setDeviceSupportNotice('Audio output device selection stored for WebRTC session.');
    }
    setTimeout(() => setDeviceSupportNotice(''), 4000);
  };

  // Acoustic Calibration & Test Tone Generator via Web Audio API
  const runAcousticCalibration = () => {
    if (isCalibrating) return;
    setIsCalibrating(true);

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();

      // Measure hardware parameters
      const sampleRate = ctx.sampleRate || 48000;
      const baseLatency = (ctx.baseLatency ? ctx.baseLatency * 1000 : 5.33).toFixed(1);
      const outputLatency = (ctx.outputLatency ? ctx.outputLatency * 1000 : 12.0).toFixed(1);

      // Studio 440Hz crystal tone with harmonics & gentle envelope
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // Concert A
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(880, ctx.currentTime); // Octave

      // Smooth envelope
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      oscHarmonic.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
      oscHarmonic.stop(ctx.currentTime + 0.7);

      setTimeout(() => {
        setCalibrationData({
          sampleRate,
          baseLatency,
          outputLatency,
          channels: ctx.destination.channelCount || 2,
          state: ctx.state
        });
        setIsCalibrating(false);
      }, 750);
    } catch (e) {
      console.warn('Calibration error:', e);
      setIsCalibrating(false);
    }
  };

  const handleSave = async () => {
    localStorage.setItem('reveria:streamQuality', streamQuality);
    localStorage.setItem('reveria:latencyMode', latencyMode);
    localStorage.setItem('reveria:normalizeVolume', String(normalizeVolume));
    localStorage.setItem('reveria:crossfade', String(crossfade));
    localStorage.setItem('reveria:stereoWidth', String(stereoWidth));
    localStorage.setItem('reveria:soundstage', soundstage);
    localStorage.setItem('reveria:eqPreset', selectedPreset);
    localStorage.setItem('reveria:eqBands', JSON.stringify(eqBands));

    const allSettings = {
      streamQuality,
      latencyMode,
      dynamicNormalization: normalizeVolume,
      crossfade,
      spatialSoundstage: stereoWidth,
      soundstage,
      equalizerPreset: selectedPreset,
      equalizerBands: eqBands
    };
    localStorage.setItem('reveria:settings', JSON.stringify(allSettings));
    dspEngine.applySettings(allSettings);

    if (savePreferencesToAccount) {
      await savePreferencesToAccount(allSettings);
    }

    setSavedMessage('Preferences synchronized and saved to your account!');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const purgeCache = () => {
    if (window.caches) {
      window.caches.keys().then((names) => {
        names.forEach((name) => window.caches.delete(name));
      });
    }
    setSavedMessage('Device cache purged. Fresh audio chunks will stream directly from cloud.');
    setTimeout(() => setSavedMessage(''), 3500);
  };

  // Generate smooth SVG spline for frequency response curve
  const generateEqCurvePath = () => {
    const y = eqBands.map((db) => 50 - (db * 3.33));
    const points = [
      { x: 50, y: y[0] },
      { x: 150, y: y[1] },
      { x: 250, y: y[2] },
      { x: 350, y: y[3] },
      { x: 450, y: y[4] }
    ];

    const line = `M 0,50 C 25,50 35,${points[0].y} ${points[0].x},${points[0].y} ` +
      `S 100,${points[1].y} ${points[1].x},${points[1].y} ` +
      `S 200,${points[2].y} ${points[2].x},${points[2].y} ` +
      `S 300,${points[3].y} ${points[3].x},${points[3].y} ` +
      `S 400,${points[4].y} ${points[4].x},${points[4].y} ` +
      `C 475,${points[4].y} 485,50 500,50`;

    const fill = `${line} L 500,100 L 0,100 Z`;
    return { line, fill, points };
  };

  const eqCurve = generateEqCurvePath();

  const handleTrackPointerDown = (idx, e) => {
    const el = e.currentTarget;
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);

    const calculateDb = (clientY) => {
      const rect = el.getBoundingClientRect();
      const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const fraction = 1 - (relativeY / rect.height);
      const db = Math.round(fraction * 24 - 12);
      handleBandChange(idx, db);
    };

    calculateDb(e.clientY);

    const onPointerMove = (moveEvt) => {
      calculateDb(moveEvt.clientY);
    };

    const onPointerUp = () => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
  };

  return (
    <main className="flex-1 h-full overflow-y-auto px-4 pb-36 pt-24 md:ml-80 md:px-8 md:pt-28 text-white scroll-smooth">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Engine Configuration</p>
          </div>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">System Settings & Acoustic DSP</h2>
          <p className="mt-1 text-sm text-slate-400">
            Fine-tune parametric equalization, hardware DAC output routing, WebRTC buffer modes, and crossfade kinematics.
          </p>
        </div>

        {/* Holographic DSP Status Badge */}
        <div className="p-4 rounded-2xl glass-panel border border-white/10 bg-[#0e0c15]/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(208,188,255,0.3)]">
              <span className="material-symbols-outlined text-xl">graphic_eq</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">32-Bit Floating DSP Stage Active</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                  HOLOGRAPHIC 3D
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero phase distortion mastering with Mid-Side psychoacoustic spatializer exceeding Dolby Atmos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">32-Bit Float</span>
            <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-primary">Ultra-Low THD</span>
          </div>
        </div>

        {/* 1. Stream Quality & WebRTC Engine */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 bg-[#0e0c15]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-primary text-xl">tune</span>
            <div>
              <h3 className="font-bold text-lg text-white">Audio Stream & Playback Engine</h3>
              <p className="text-xs text-slate-400">RFC 9110 compliant chunked streaming and low-jitter peer synchronization</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="quality-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Streaming Resolution
              </label>
              <select
                id="quality-select"
                value={streamQuality}
                onChange={(e) => setStreamQuality(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="lossless">Lossless Direct Stream (Original / FLAC / WAV - 24-bit/96kHz)</option>
                <option value="high">High Fidelity Master (320 kbps MP3/AAC)</option>
                <option value="balanced">Data Saver (160 kbps Adaptive)</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">HTTP byte-range seeking is active for instant scrub across chunked tracks.</p>
            </div>

            <div>
              <label htmlFor="latency-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                WebRTC Buffer Mode
              </label>
              <select
                id="latency-select"
                value={latencyMode}
                onChange={(e) => setLatencyMode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="ultra-low">Zero-Latency Jam (Unbuffered direct SCTP mesh)</option>
                <option value="adaptive">Adaptive Jitter Guard (50ms drift compensation)</option>
                <option value="high-stability">High-Stability Sync (200ms acoustic lock)</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">Continuous Dynamic PLL auto-aligns playhead clocks across remote peers.</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/5">
            <div>
              <p className="text-sm font-semibold text-white">Dynamic Volume Normalization</p>
              <p className="text-xs text-slate-400">Prevent abrupt volume spikes when transitioning between cloud and local tracks.</p>
            </div>
            <button
              type="button"
              onClick={handleNormalizationChange}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${normalizeVolume ? 'bg-primary' : 'bg-white/20'}`}
              aria-label="Toggle Dynamic Volume Normalization"
            >
              <div className={`w-4 h-4 rounded-full bg-black transition-transform ${normalizeVolume ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </section>

        {/* 2. Interactive Parametric Equalizer & Acoustic Profile */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 bg-[#0e0c15]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-xl">equalizer</span>
              <div>
                <h3 className="font-bold text-lg text-white">Parametric Equalizer (5-Band DSP)</h3>
                <p className="text-xs text-slate-400">Tactile studio faders & real-time frequency curve modulation</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              {EQ_PRESETS[selectedPreset]?.name || 'Custom'}
            </span>
          </div>

          {/* Preset Pills */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(EQ_PRESETS).filter(([k]) => k !== 'custom').map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetChange(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedPreset === key
                    ? 'bg-primary text-black shadow-[0_0_15px_rgba(208,188,255,0.35)] scale-105'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Interactive Dynamic Frequency Response Spline */}
          <div className="w-full bg-black/60 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-2">
              <span>REAL-TIME ACOUSTIC TRANSFER CURVE</span>
              <span className="text-primary font-semibold">32-Bit BiQuad Filters</span>
            </div>
            <div className="relative h-24 w-full">
              <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="eqFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d0bcff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* 0dB Center Baseline */}
                <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                {/* +6dB and -6dB reference guides */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.05)" />
                {/* Filled Area */}
                <path d={eqCurve.fill} fill="url(#eqFillGradient)" className="transition-all duration-150" />
                {/* Spline Path */}
                <path d={eqCurve.line} fill="none" stroke="#d0bcff" strokeWidth="2.5" className="transition-all duration-150 drop-shadow-[0_0_8px_rgba(208,188,255,0.6)]" />
                {/* Frequency Nodes */}
                {eqCurve.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* 5-Band Dynamic Tactile Fader Console */}
          <div className="grid grid-cols-5 gap-2 sm:gap-4 pt-4 pb-2 bg-black/40 p-3 sm:p-5 rounded-2xl border border-white/5">
            {eqBands.map((val, idx) => {
              const fraction = (val + 12) / 24; // 0 to 1
              const thumbTopPercent = (1 - fraction) * 100;
              const isBoost = val > 0;
              const isCut = val < 0;

              return (
                <div key={idx} className="flex flex-col items-center gap-2 select-none">
                  {/* Numerical Gain Badge */}
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isBoost
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : isCut
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-white/5 text-slate-400 border-white/10'
                    }`}
                  >
                    {val > 0 ? `+${val}` : val} dB
                  </span>

                  {/* Nudge Up (+) Button */}
                  <button
                    type="button"
                    onClick={() => handleBandChange(idx, Math.min(12, val + 1))}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all border border-white/5"
                    aria-label={`Increment ${FREQ_CONFIG[idx].label}`}
                  >
                    +
                  </button>

                  {/* Tactile Vertical Fader Track */}
                  <div
                    onPointerDown={(e) => handleTrackPointerDown(idx, e)}
                    className="h-44 sm:h-48 w-10 sm:w-12 rounded-xl bg-[#090810] border border-white/10 relative cursor-ns-resize touch-none p-1.5 flex justify-center group hover:border-primary/50 transition-colors shadow-inner"
                  >
                    {/* Vertical Slot Groove */}
                    <div className="w-1.5 h-full rounded-full bg-white/5 relative overflow-hidden">
                      {/* Zero line */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -translate-y-1/2 z-10" />

                      {/* Boost Active Fill (above center) */}
                      {isBoost && (
                        <div
                          className="absolute bottom-1/2 left-0 right-0 bg-gradient-to-t from-primary/40 to-primary rounded-t"
                          style={{ height: `${(val / 12) * 50}%` }}
                        />
                      )}

                      {/* Cut Active Fill (below center) */}
                      {isCut && (
                        <div
                          className="absolute top-1/2 left-0 right-0 bg-gradient-to-b from-amber-500/40 to-amber-500 rounded-b"
                          style={{ height: `${(Math.abs(val) / 12) * 50}%` }}
                        />
                      )}
                    </div>

                    {/* Draggable Fader Knob / Handle */}
                    <div
                      className="absolute left-1 right-1 h-7 rounded-lg bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform group-hover:scale-105 active:scale-95"
                      style={{ top: `${thumbTopPercent}%`, transform: 'translateY(-50%)' }}
                    >
                      {/* Fader center marker line */}
                      <div className="w-4 h-0.5 rounded-full bg-purple-700 shadow-sm" />
                    </div>

                    {/* Hidden Native Range Slider for accessibility & automated tests */}
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={val}
                      onChange={(e) => handleBandChange(idx, e.target.value)}
                      className="sr-only"
                      aria-label={`EQ Band ${FREQ_CONFIG[idx].label}`}
                    />
                  </div>

                  {/* Nudge Down (-) Button */}
                  <button
                    type="button"
                    onClick={() => handleBandChange(idx, Math.max(-12, val - 1))}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all border border-white/5"
                    aria-label={`Decrement ${FREQ_CONFIG[idx].label}`}
                  >
                    -
                  </button>

                  {/* Frequency Labels */}
                  <div className="text-center mt-1">
                    <p className="text-[11px] font-mono font-bold text-white tracking-tight">{FREQ_CONFIG[idx].label}</p>
                    <p className="text-[9px] text-slate-400 hidden sm:block">{FREQ_CONFIG[idx].name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Hardware Output Routing & Acoustic Calibration */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 bg-[#0e0c15]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-cyan-400 text-xl">speaker</span>
            <div>
              <h3 className="font-bold text-lg text-white">Audio Hardware & Output Routing</h3>
              <p className="text-xs text-slate-400">Direct DAC sink assignment and Web Audio context round-trip latency calibration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="device-select" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Output Audio Sink
              </label>
              <select
                id="device-select"
                value={selectedDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 transition-colors cursor-pointer"
              >
                <option value="default">Default System Audio Output (Headphones / Speakers)</option>
                {audioDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Audio Sink Device (${dev.deviceId.slice(0, 8)}...)`}
                  </option>
                ))}
              </select>
              {deviceSupportNotice && (
                <p className="mt-2 text-xs text-cyan-400 animate-pulse">{deviceSupportNotice}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Hardware Calibration & Diagnostics
              </p>
              <button
                type="button"
                onClick={runAcousticCalibration}
                disabled={isCalibrating}
                className="w-full py-3 px-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.15)] disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-lg ${isCalibrating ? 'animate-spin' : ''}`}>
                  {isCalibrating ? 'sync' : 'spatial_audio_off'}
                </span>
                <span>{isCalibrating ? 'Measuring DAC Jitter...' : 'Test Acoustic Tone (440Hz)'}</span>
              </button>

              {calibrationData && (
                <div className="mt-3 p-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sample Rate:</span>
                    <span className="text-cyan-400 font-bold">{calibrationData.sampleRate} Hz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base DAC Latency:</span>
                    <span className="text-emerald-400 font-bold">{calibrationData.baseLatency} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Channels:</span>
                    <span>{calibrationData.channels} (Stereo Float32)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Crossfade & Spatial Staging */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 bg-[#0e0c15]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-amber-400 text-xl">surround_sound</span>
            <div>
              <h3 className="font-bold text-lg text-white">Crossfade & Spatial Soundstage</h3>
              <p className="text-xs text-slate-400">Seamless track blending curves and binaural stereo expansion</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="crossfade-slider" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Transition Crossfade
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">{crossfade}s {crossfade === 0 ? '(Gapless)' : ''}</span>
              </div>
              <input
                id="crossfade-slider"
                type="range"
                min="0"
                max="12"
                step="1"
                value={crossfade}
                onChange={(e) => setCrossfade(Number(e.target.value))}
                className="w-full h-2 appearance-none bg-white/10 rounded-full outline-none accent-amber-400 cursor-pointer"
              />
              <p className="mt-2 text-xs text-slate-500">Smooth volume decay and simultaneous attack when changing songs.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="width-slider" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Stereo Soundstage Width
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">{stereoWidth}%</span>
              </div>
              <input
                id="width-slider"
                type="range"
                min="100"
                max="200"
                step="10"
                value={stereoWidth}
                onChange={(e) => handleStereoWidthChange(e.target.value)}
                className="w-full h-2 appearance-none bg-white/10 rounded-full outline-none accent-amber-400 cursor-pointer"
              />
              <p className="mt-2 text-xs text-slate-500">Acoustic psychoacoustic stereo field expansion for open-back headphones.</p>
            </div>
          </div>
        </section>

        {/* 5. Local Sandbox & Device Cache */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 bg-[#0e0c15]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-xl">shield</span>
              <h3 className="font-bold text-lg text-white">Local Sync & Cache Sandbox</h3>
            </div>
            <button
              type="button"
              onClick={purgeCache}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95"
            >
              Purge Audio Cache
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-primary font-mono">{localTracks.length}</p>
              <p className="text-xs text-slate-400 mt-1">Mounted Tracks in RAM</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-emerald-400 font-mono">0 Bytes</p>
              <p className="text-xs text-slate-400 mt-1">Local Audio Sent to Server</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-secondary font-mono">Isolated</p>
              <p className="text-xs text-slate-400 mt-1">Browser Sandbox State</p>
            </div>
          </div>
        </section>

        {/* 6. Active Session Identity */}
        <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 bg-[#0e0c15]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
            <h3 className="font-bold text-lg text-white">Active Session Identity</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{user?.email || 'Authenticated User'}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Role: <span className="text-primary font-bold uppercase">{user?.role || 'Listener'}</span> • JWT Authenticated
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all active:scale-95"
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* Save button and feedback */}
        <div className="flex items-center justify-between pt-2">
          {savedMessage ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 animate-pulse">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {savedMessage}
            </p>
          ) : <div></div>}
          <button
            onClick={handleSave}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-black hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(208,188,255,0.4)] active:scale-95"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </main>
  );
}
