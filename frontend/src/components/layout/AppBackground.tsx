/**
 * Full-screen background — dark landscape in dark mode, soft grey in light mode.
 */
export function AppBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* ── Dark mode: illustrated landscape ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#050505" />
            <stop offset="55%"  stopColor="#111111" />
            <stop offset="100%" stopColor="#1c1c1c" />
          </linearGradient>
          <linearGradient id="bg-mtn1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <linearGradient id="bg-mtn2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#222222" />
            <stop offset="100%" stopColor="#121212" />
          </linearGradient>
          <radialGradient id="bg-glow" cx="50%" cy="42%" r="35%">
            <stop offset="0%"   stopColor="#303030" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#050505" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#bg-sky)" />
        <ellipse cx="720" cy="390" rx="560" ry="210" fill="url(#bg-glow)" />

        {/* Stars */}
        {([
          [110,45],[230,28],[370,68],[510,22],[660,48],[810,18],[960,62],[1110,38],[1260,52],[1395,28],
          [65,105],[305,88],[455,118],[605,78],[755,102],[905,82],[1055,112],[1205,92],[1355,78],
          [155,162],[415,148],[575,172],[735,152],[895,168],[1055,142],[1215,162],[1395,148],
        ] as [number,number][]).map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={i%4===0?1.8:i%3===0?1.2:0.8}
            fill="white" opacity={0.12+(i%6)*0.06} />
        ))}

        <path d="M0 530 L160 295 L340 430 L520 270 L700 390 L880 250 L1060 370 L1240 285 L1420 405 L1440 410 L1440 900 L0 900Z"
          fill="url(#bg-mtn1)" opacity="0.65" />
        <path d="M0 610 L110 430 L270 530 L430 390 L590 490 L750 370 L910 470 L1070 410 L1230 510 L1390 445 L1440 460 L1440 900 L0 900Z"
          fill="url(#bg-mtn2)" opacity="0.82" />

        {([55,105,150,190,225,255] as number[]).map((x,i) => (
          <g key={`lp${i}`} transform={`translate(${x},${630-i*7})`}>
            <polygon points="0,-75 20,0 -20,0" fill="#161616" opacity="0.92" />
            <polygon points="0,-52 15,12 -15,12" fill="#1e1e1e" opacity="0.82" />
            <rect x="-5" y="0" width="10" height="20" fill="#0e0e0e" />
          </g>
        ))}
        {([1385,1335,1290,1250,1215,1185] as number[]).map((x,i) => (
          <g key={`rp${i}`} transform={`translate(${x},${630-i*7})`}>
            <polygon points="0,-75 20,0 -20,0" fill="#161616" opacity="0.92" />
            <polygon points="0,-52 15,12 -15,12" fill="#1e1e1e" opacity="0.82" />
            <rect x="-5" y="0" width="10" height="20" fill="#0e0e0e" />
          </g>
        ))}

        <ellipse cx="75"   cy="705" rx="65" ry="38" fill="#141414" opacity="0.9" />
        <ellipse cx="185"  cy="715" rx="52" ry="32" fill="#1a1a1a" opacity="0.85" />
        <ellipse cx="1365" cy="705" rx="65" ry="38" fill="#141414" opacity="0.9" />
        <ellipse cx="1255" cy="715" rx="52" ry="32" fill="#1a1a1a" opacity="0.85" />

        <path d="M0 738 Q360 708 720 725 Q1080 742 1440 720 L1440 900 L0 900Z" fill="#0a0a0a" />
        <path d="M180 768 Q720 748 1260 768 L1260 828 Q720 808 180 828Z" fill="#1a1a1a" opacity="0.45" />

        {[0,1,2,3].map(i => (
          <line key={`sh${i}`}
            x1={480+i*110} y1={780+i*7} x2={680+i*110} y2={780+i*7}
            stroke="white" strokeWidth="1" opacity="0.04" />
        ))}

        <ellipse cx="195"  cy="125" rx="85"  ry="22" fill="white" opacity="0.04" />
        <ellipse cx="345"  cy="108" rx="62"  ry="16" fill="white" opacity="0.03" />
        <ellipse cx="1095" cy="132" rx="92"  ry="24" fill="white" opacity="0.04" />
        <ellipse cx="1255" cy="115" rx="68"  ry="18" fill="white" opacity="0.03" />
      </svg>

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55" />

      {/* ── Light mode overlay: soft white wash ── */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: 'rgba(240,240,240,0.92)' }}
        id="light-overlay"
      />
    </div>
  );
}
