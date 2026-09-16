const STAR_OFFSETS = [
  { x: -60, delay: 0 },
  { x: -28, delay: 80 },
  { x: 0, delay: 40 },
  { x: 28, delay: 120 },
  { x: 60, delay: 60 },
];

export function StarBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-visible">
      {STAR_OFFSETS.map((star, i) => (
        <span
          key={i}
          className="star-particle absolute top-8 text-3xl"
          style={{
            left: `calc(50% + ${star.x}px)`,
            animation: `star-float 1.1s ease-out ${star.delay}ms both`,
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}
