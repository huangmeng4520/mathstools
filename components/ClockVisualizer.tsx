import React from 'react';

interface ClockVisualizerProps {
  hour?: number;
  minute?: number;
  showNumbers?: boolean;
  size?: number;
  label?: string;
}

export const ClockVisualizer: React.FC<ClockVisualizerProps> = ({ 
  hour = 12, 
  minute = 0, 
  showNumbers = true,
  size = 200,
  label
}) => {
  // Normalize time
  const normalizedHour = hour % 12;
  const normalizedMinute = minute % 60;

  // Calculate angles (0 degrees is at 12 o'clock)
  const minuteAngle = normalizedMinute * 6;
  const hourAngle = (normalizedHour * 30) + (normalizedMinute * 0.5);

  const radius = 45;
  const center = 50;

  // Generate numbers
  const numbers = [];
  if (showNumbers) {
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = center + (radius - 8) * Math.cos(angle);
      const y = center + (radius - 8) * Math.sin(angle);
      numbers.push(
        <text 
          key={i} 
          x={x} 
          y={y} 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-[6px] font-bold font-mono fill-gray-800"
        >
          {i}
        </text>
      );
    }
  }

  // Generate ticks
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const isHour = i % 5 === 0;
    const angle = (i * 6 - 90) * (Math.PI / 180);
    const innerR = isHour ? radius - 4 : radius - 2;
    const outerR = radius;
    
    const x1 = center + innerR * Math.cos(angle);
    const y1 = center + innerR * Math.sin(angle);
    const x2 = center + outerR * Math.cos(angle);
    const y2 = center + outerR * Math.sin(angle);

    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke="black"
        strokeWidth={isHour ? 1 : 0.5}
        strokeLinecap="round"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto">
      <div style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          {/* Clock Face Background */}
          <circle cx={center} cy={center} r={radius} fill="white" stroke="#374151" strokeWidth="1.5" />
          
          {/* Ticks */}
          {ticks}
          
          {/* Numbers */}
          {numbers}

          {/* Hour Hand */}
          <line
            x1={center} y1={center}
            x2={center + (radius - 18) * Math.cos((hourAngle - 90) * Math.PI / 180)}
            y2={center + (radius - 18) * Math.sin((hourAngle - 90) * Math.PI / 180)}
            stroke="black"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Minute Hand */}
          <line
            x1={center} y1={center}
            x2={center + (radius - 10) * Math.cos((minuteAngle - 90) * Math.PI / 180)}
            y2={center + (radius - 10) * Math.sin((minuteAngle - 90) * Math.PI / 180)}
            stroke="#4b5563" // gray-600
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Center Dot */}
          <circle cx={center} cy={center} r="1.5" fill="#1f2937" />
          
          {/* Second Hand (Optional - keeping static for math problems usually) */}
        </svg>
      </div>
      {label && (
        <div className="mt-2 text-gray-600 font-mono font-bold text-lg bg-gray-100 px-3 py-1 rounded">
          {label}
        </div>
      )}
    </div>
  );
};
