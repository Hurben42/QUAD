/**
 * The curve as four steps: widths 8/4/2/1 (coins sold per era), heights doubling (price).
 * `progress` is quote raised / threshold (0→1); each era is a quarter of it.
 */
export function EraSteps({ progress, height = 120, labels = true }: { progress: number; height?: number; labels?: boolean }) {
  const fills = [0, 1, 2, 3].map((i) => Math.max(0, Math.min(1, (progress - i * 0.25) / 0.25)));
  const widths = [8, 4, 2, 1];
  const heights = ['25%', '50%', '75%', '100%'];
  const dim = ['#1b27f540', '#7136fe40', '#e04d7140', '#f8826240'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Distance to graduation">
        {widths.map((w, i) => (
          <div key={i} style={{ flex: w, height: heights[i], background: dim[i], borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fills[i] * 100}%`, background: `var(--era-${i + 1})` }} />
          </div>
        ))}
      </div>
      {labels && (
        <>
          <div style={{ height: 1, background: 'var(--line-strong)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="label">Era 1</span><span className="label">Era 2</span><span className="label">Era 3</span><span className="label">4</span>
          </div>
        </>
      )}
    </div>
  );
}
