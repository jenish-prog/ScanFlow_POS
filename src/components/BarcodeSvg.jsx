import React from 'react';
import { generateBarcodeBars } from '../utils/barcodeGenerator';

export default function BarcodeSvg({
  code = '8901058851458',
  label = '',
  price = null,
  height = 56,
  className = '',
  lightTheme = false,
}) {
  const bars = generateBarcodeBars(code);
  const moduleWidth = 2;
  const quietZone = 14;
  const totalWidth = bars.length * moduleWidth + quietZone * 2;
  const svgHeight = height + 26;

  return (
    <div
      className={`inline-flex flex-col items-center rounded-xl p-3 border transition-all ${
        lightTheme
          ? 'bg-white text-slate-900 border-slate-200 shadow-sm'
          : 'bg-white/[0.04] text-slate-100 border-white/10'
      } ${className}`}
    >
      {(label || price !== null) && (
        <div className="w-full flex items-center justify-between gap-2 mb-1.5 px-1 text-xs">
          {label && (
            <span
              className={`font-semibold truncate max-w-[180px] ${
                lightTheme ? 'text-slate-800' : 'text-slate-200'
              }`}
            >
              {label}
            </span>
          )}
          {price !== null && (
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                lightTheme
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              MRP ₹{Number(price).toFixed(2)}
            </span>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        className="w-full max-w-[260px] h-auto"
        role="img"
        aria-label={`Barcode ${code}`}
      >
        <rect
          x="0"
          y="0"
          width={totalWidth}
          height={svgHeight}
          rx="6"
          fill={lightTheme ? '#FFFFFF' : '#F8FAFC'}
        />
        {bars.map((bar, idx) =>
          bar.bit === 1 ? (
            <rect
              key={idx}
              x={quietZone + idx * moduleWidth}
              y={6}
              width={moduleWidth * 0.95}
              height={bar.guard ? height + 6 : height}
              fill="#090A0F"
            />
          ) : null
        )}
        <text
          x={totalWidth / 2}
          y={height + 21}
          textAnchor="middle"
          fill="#090A0F"
          fontSize="11"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="2.2"
        >
          {code}
        </text>
      </svg>
    </div>
  );
}
