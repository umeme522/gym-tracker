import React from 'react';

function TrendChart({ data, label, color = '#ffcc00' }) {
  if (!data || data.length < 2) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>体重の記録が不足しています（2件以上必要）</p>;
  
  const width = 300;
  const height = 120;
  const padding = 20;
  const vals = data.map(d => d.val);
  const min = Math.min(...vals) * 0.98;
  const max = Math.max(...vals) * 1.02;
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding + (i * (width - padding * 2)) / (data.length - 1),
    y: height - padding - ((d.val - min) * (height - padding * 2)) / range,
    val: d.val
  }));

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cp1x = (points[i].x + points[i + 1].x) / 2;
    pathD += ` C ${cp1x} ${points[i].y}, ${cp1x} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="trend-container">
      <div className="trend-header">
        <span className="trend-label">{label}</span>
        <div className="trend-stats">
          <span className="min-val">min: {Math.min(...vals).toFixed(1)}</span>
          <span className="max-val">max: {Math.max(...vals).toFixed(1)}</span>
        </div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />
        <path d={areaD} fill={`url(#grad-${label})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i} className="chart-point-group">
            <circle cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
            {(i === points.length - 1 || p.val === Math.max(...vals) || p.val === Math.min(...vals)) && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="800">
                {p.val.toFixed(1)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <style jsx>{`
        .trend-container { margin-top: 10px; margin-bottom: 20px; }
        .trend-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .trend-label { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.5); }
        .trend-stats { display: flex; gap: 8px; font-size: 0.7rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}

export default TrendChart;
