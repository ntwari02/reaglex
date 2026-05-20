import { Check, Moon, Sun } from 'lucide-react';
import { useCommerceTheme } from '../../stores/commerceThemeStore';

/** Shared 2030 appearance controls — overlay + settings page */
export default function AccountAppearancePanel({ compact = false }) {
  const {
    mode,
    setMode,
    followSystem,
    setFollowSystem,
    accent,
    setAccent,
    blurIntensity,
    setBlurIntensity,
    motionIntensity,
    setMotionIntensity,
    density,
    setDensity,
  } = useCommerceTheme();

  const accents = [
    { id: 'orange', color: '#FF6A00' },
    { id: 'blue', color: '#3B82F6' },
    { id: 'purple', color: '#A855F7' },
    { id: 'emerald', color: '#10B981' },
  ];

  return (
    <div className={compact ? 'px-0' : 'px-2'}>
      {!compact && (
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Adaptive dark themes only — Cinema for depth, Ambient for softer contrast. No white flash modes.
        </p>
      )}

      <p className="aco-group-title" style={{ margin: compact ? '0 0 10px' : '8px 0 10px' }}>
        THEME MODE
      </p>
      <div className="aco-theme-grid" style={{ paddingLeft: compact ? 0 : undefined, paddingRight: compact ? 0 : undefined }}>
        {[
          { id: 'cinema', label: 'Cinema Mode', visual: 'aco-theme-visual--cinema', Icon: Moon },
          { id: 'ambient', label: 'Ambient Mode', visual: 'aco-theme-visual--ambient', Icon: Sun },
        ].map(({ id, label, visual, Icon }) => (
          <button
            key={id}
            type="button"
            className={`aco-theme-card${mode === id ? ' aco-theme-card--active' : ''}`}
            onClick={() => setMode(id)}
          >
            <div className={`aco-theme-visual ${visual}`}>
              <Icon size={36} style={{ color: 'rgba(255,255,255,0.7)' }} />
            </div>
            <div className="aco-theme-label flex items-center justify-between">
              {label}
              {mode === id && <Check size={16} style={{ color: '#ff6a00' }} />}
            </div>
          </button>
        ))}
      </div>

      <label
        className="flex items-center justify-between py-3 text-sm font-semibold"
        style={{ color: 'rgba(255,255,255,0.75)' }}
      >
        Follow system theme
        <input
          type="checkbox"
          checked={followSystem}
          onChange={(e) => setFollowSystem(e.target.checked)}
          className="accent-[#ff6a00]"
        />
      </label>

      <p className="aco-group-title">ACCENT COLOR</p>
      <div className="aco-accent-row" style={{ paddingLeft: compact ? 0 : undefined }}>
        {accents.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`aco-accent-chip${accent === a.id ? ' aco-accent-chip--active' : ''}`}
            style={{ background: a.color }}
            onClick={() => setAccent(a.id)}
            aria-label={a.id}
          />
        ))}
      </div>

      <div className="aco-slider-block" style={{ paddingLeft: compact ? 0 : undefined }}>
        <div className="aco-slider-label">
          <span>Blur intensity</span>
          <span>{blurIntensity}%</span>
        </div>
        <input
          type="range"
          min={20}
          max={100}
          value={blurIntensity}
          onChange={(e) => setBlurIntensity(Number(e.target.value))}
          className="aco-slider"
        />
      </div>

      <div className="aco-slider-block" style={{ paddingLeft: compact ? 0 : undefined }}>
        <div className="aco-slider-label">
          <span>Motion intensity</span>
          <span>{motionIntensity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={motionIntensity}
          onChange={(e) => setMotionIntensity(Number(e.target.value))}
          className="aco-slider"
        />
      </div>

      <p className="aco-group-title">INTERFACE DENSITY</p>
      <div className="aco-density-row" style={{ paddingLeft: compact ? 0 : undefined, paddingBottom: 16 }}>
        {['cozy', 'comfortable', 'compact'].map((d) => (
          <button
            key={d}
            type="button"
            className={`aco-density-btn${density === d ? ' aco-density-btn--active' : ''}`}
            onClick={() => setDensity(d)}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
