interface HistogramProps {
  values: number[];
}

export function Histogram({ values }: HistogramProps) {
  const barWidth = 160 / Math.max(values.length, 1);
  return (
    <svg className="histogram" viewBox="0 0 160 48" preserveAspectRatio="none" role="img" aria-label="Histograma de luminosidad de la imagen">
      {values.map((value, index) => (
        <rect
          key={index}
          x={index * barWidth}
          y={48 - value * 43}
          width={Math.max(1, barWidth - 0.55)}
          height={value * 43}
          rx="0.7"
          fill={index < 10 ? '#71818a' : index > 23 ? '#d0d8ce' : '#a4b5ab'}
          opacity={0.46 + value * 0.4}
        />
      ))}
    </svg>
  );
}
