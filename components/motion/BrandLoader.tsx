export default function BrandLoader({ label = 'Loading' }: { label?: string }) {
  // Bars that rise like a growth chart / equalizer
  const bars = [0.35, 0.55, 0.42, 0.7, 0.58, 0.85, 0.72, 1]

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 34, minHeight: '70vh', width: '100%',
      }}
    >
      {/* Animated growth bars */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 9, height: 110 }}>
        {/* Ambient glow */}
        <div
          className="bl-glow"
          style={{
            position: 'absolute', inset: '-40px -30px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(168,85,247,0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {bars.map((h, i) => (
          <div
            key={i}
            className="bl-bar"
            style={{
              width: 13,
              height: `${h * 100}%`,
              borderRadius: 6,
              background: `linear-gradient(180deg, #c084fc 0%, #a855f7 60%, #7c3aed 100%)`,
              boxShadow: '0 0 14px rgba(168,85,247,0.35)',
              animationDelay: `${i * 95}ms`,
              transformOrigin: 'bottom',
            }}
          />
        ))}
        {/* Trend line dot on top of last bar */}
        <div
          className="bl-spark"
          style={{
            position: 'absolute', right: 0, top: -6,
            width: 10, height: 10, borderRadius: '50%',
            background: '#fff', boxShadow: '0 0 12px 3px rgba(192,132,252,0.9)',
          }}
        />
      </div>

      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <p className="font-outfit" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0 }}>
          Track<span style={{ color: '#c084fc' }}>Scaler</span>
        </p>
        <p className="bl-label" style={{ fontSize: 13, color: 'var(--muted)', margin: '10px 0 0', letterSpacing: '0.02em' }}>
          {label}
        </p>
      </div>

      <style>{`
        @keyframes bl-rise {
          0%   { transform: scaleY(0.25); opacity: 0.45; }
          50%  { transform: scaleY(1);    opacity: 1; }
          100% { transform: scaleY(0.25); opacity: 0.45; }
        }
        @keyframes bl-pulse {
          0%, 100% { opacity: 0.55; transform: scale(0.92); }
          50%      { opacity: 1;    transform: scale(1.06); }
        }
        @keyframes bl-spark {
          0%, 100% { opacity: 0.6; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes bl-label {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.9; }
        }
        .bl-bar   { animation: bl-rise 1.5s cubic-bezier(0.4,0,0.2,1) infinite; }
        .bl-glow  { animation: bl-pulse 2s ease-in-out infinite; }
        .bl-spark { animation: bl-spark 1.5s ease-in-out infinite; }
        .bl-label { animation: bl-label 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .bl-bar, .bl-glow, .bl-spark, .bl-label { animation: none; }
          .bl-bar { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
