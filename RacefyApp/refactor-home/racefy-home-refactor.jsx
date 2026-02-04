import { useState, useEffect } from "react";

const COLORS = {
  bg: "#0a0f1a",
  card: "#111827",
  cardAlt: "#0d1420",
  accent: "#10b981",
  accentDim: "rgba(16, 185, 129, 0.12)",
  accentGlow: "rgba(16, 185, 129, 0.25)",
  pink: "#f43f5e",
  orange: "#f59e0b",
  blue: "#3b82f6",
  text: "#f1f5f9",
  textDim: "#94a3b8",
  textMuted: "#64748b",
  border: "rgba(255,255,255,0.06)",
};

// Animated number component
const AnimNum = ({ value, suffix = "" }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const num = parseFloat(value);
    const dur = 1200;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(ease * num);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return (
    <span>
      {typeof value === "string" && value.includes(".")
        ? display.toFixed(1)
        : Math.round(display)}
      {suffix}
    </span>
  );
};

// Ring progress
const Ring = ({ pct, size = 52, stroke = 4, color = COLORS.accent, children }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    setTimeout(() => setOffset(circ - (pct / 100) * circ), 200);
  }, [pct]);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

// Icons
const Icons = {
  fire: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z" />
    </svg>
  ),
  run: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="17" cy="4" r="2" /><path d="M10.5 21l3-9-4.5 1-2-4 6-3 3 3 4 1" />
    </svg>
  ),
  route: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  play: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={COLORS.accent} stroke="none">
      <polygon points="6,3 20,12 6,21" />
    </svg>
  ),
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  chevron: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  trophy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  live: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={COLORS.pink} stroke="none">
      <circle cx="12" cy="12" r="6" />
    </svg>
  ),
};

// Staggered fade in wrapper
const FadeIn = ({ delay = 0, children, style = {} }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default function RacefyHome() {
  const [activeTab, setActiveTab] = useState("Home");
  const [tipExpanded, setTipExpanded] = useState(false);

  const stats = [
    { label: "Aktywności", value: "31", icon: Icons.run, color: COLORS.accent },
    { label: "Dystans", value: "84.4", suffix: " km", icon: Icons.route, color: COLORS.blue },
    { label: "Czas", value: "521", suffix: " min", icon: Icons.clock, color: COLORS.textDim },
    { label: "Kalorie", value: "2281", icon: Icons.fire, color: COLORS.orange },
  ];

  const weekDays = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
  const weekActivity = [1, 1, 0, 1, 0, 0, 0]; // 1 = done, 0 = rest/todo
  const today = 3; // Thursday index (0-based)

  const tabs = [
    { name: "Home", icon: "⌂" },
    { name: "Feed", icon: "☰" },
    { name: "Record", icon: "+" },
    { name: "Events", icon: "📅" },
    { name: "Profile", icon: "◉" },
  ];

  return (
    <div
      style={{
        width: 390,
        height: 844,
        background: COLORS.bg,
        borderRadius: 40,
        overflow: "hidden",
        position: "relative",
        fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
        color: COLORS.text,
        boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
        margin: "0 auto",
      }}
    >
      {/* Status bar */}
      <div style={{ height: 54, padding: "14px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textDim }}>1:16</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 16, height: 10, border: `1.5px solid ${COLORS.textMuted}`, borderRadius: 3, position: "relative" }}>
            <div style={{ position: "absolute", left: 1.5, top: 1.5, bottom: 1.5, width: "60%", background: COLORS.accent, borderRadius: 1 }} />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ height: 700, overflowY: "auto", padding: "0 20px 20px" }}>

        {/* Header — REFACTORED: compact, avatar left, actions right */}
        <FadeIn delay={50}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg, ${COLORS.accent}, #059669)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: "#fff",
                  boxShadow: `0 0 16px ${COLORS.accentGlow}`,
                }}
              >
                S
              </div>
              <div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>Dobranoc</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Sebastian</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.border}` }}>
                {Icons.bell}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* REFACTORED: Quick Start CTA — prominent, single primary action */}
        <FadeIn delay={120}>
          <button
            style={{
              width: "100%", padding: "18px 24px",
              background: `linear-gradient(135deg, ${COLORS.accent}, #059669)`,
              border: "none", borderRadius: 20, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              boxShadow: `0 8px 32px ${COLORS.accentGlow}, 0 0 0 1px rgba(16,185,129,0.3)`,
              marginBottom: 20,
            }}
          >
            {Icons.play}
            <span style={{ color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: 0.5 }}>
              Rozpocznij trening
            </span>
          </button>
        </FadeIn>

        {/* REFACTORED: Weekly streak — new section, gamification */}
        <FadeIn delay={200}>
          <div
            style={{
              background: COLORS.card, borderRadius: 20, padding: "18px 20px",
              marginBottom: 16, border: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {Icons.fire}
                <span style={{ fontSize: 14, fontWeight: 600 }}>Seria tygodniowa</span>
              </div>
              <span style={{ fontSize: 13, color: COLORS.orange, fontWeight: 600 }}>3 / 5 dni</span>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              {weekDays.map((d, i) => {
                const done = weekActivity[i];
                const isToday = i === today;
                const isPast = i < today;
                return (
                  <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 12,
                        background: done
                          ? `linear-gradient(135deg, ${COLORS.accent}, #059669)`
                          : isToday
                          ? COLORS.accentDim
                          : "rgba(255,255,255,0.03)",
                        border: isToday && !done ? `1.5px dashed ${COLORS.accent}` : "1px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14,
                        transition: "all 0.3s ease",
                      }}
                    >
                      {done ? "✓" : isPast ? "–" : ""}
                    </div>
                    <span style={{ fontSize: 11, color: isToday ? COLORS.accent : COLORS.textMuted, fontWeight: isToday ? 600 : 400 }}>{d}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* REFACTORED: Stats — horizontal scroll cards instead of single block */}
        <FadeIn delay={300}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Twoje statystyki</span>
              <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 500, cursor: "pointer" }}>Szczegóły →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    background: COLORS.card, borderRadius: 16, padding: "16px",
                    border: `1px solid ${COLORS.border}`,
                    display: "flex", flexDirection: "column", gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {s.icon}
                    <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500 }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>
                    <AnimNum value={s.value} suffix={s.suffix || ""} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* REFACTORED: Tip — collapsible, less space by default */}
        <FadeIn delay={400}>
          <div
            style={{
              background: COLORS.card, borderRadius: 20, padding: "16px 20px",
              marginBottom: 16, border: `1px solid ${COLORS.border}`,
              cursor: "pointer",
            }}
            onClick={() => setTipExpanded(!tipExpanded)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Postęp nie jest liniowy</span>
              </div>
              <div
                style={{
                  transform: tipExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                {Icons.chevron}
              </div>
            </div>
            <div
              style={{
                maxHeight: tipExpanded ? 120 : 0,
                overflow: "hidden",
                transition: "max-height 0.35s ease",
              }}
            >
              <p style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.5, margin: "12px 0 0", padding: 0 }}>
                Niektóre tygodnie będą się wydawać łatwiejsze niż inne, a to jest całkowicie normalne. Adaptacje treningowe zachodzą z czasem — bądź cierpliwy!
              </p>
              <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                {[1, 2, 3, 4].map((_, i) => (
                  <div key={i} style={{ fontSize: 12, color: COLORS.accent }}>⚡</div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* REFACTORED: Quick Actions — secondary, smaller */}
        <FadeIn delay={480}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Dodaj post", icon: "✏️", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.15)" },
              { label: "Wydarzenia", icon: "🏆", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)" },
            ].map((a) => (
              <button
                key={a.label}
                style={{
                  flex: 1, padding: "14px", background: a.bg,
                  border: `1px solid ${a.border}`, borderRadius: 16,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* REFACTORED: Live events — compact card */}
        <FadeIn delay={560}>
          <div
            style={{
              background: COLORS.card, borderRadius: 20, overflow: "hidden",
              border: `1px solid ${COLORS.border}`, marginBottom: 20,
            }}
          >
            <div
              style={{
                height: 120,
                background: "linear-gradient(135deg, #1e3a5f 0%, #0c1929 50%, #1a2e45 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Decorative ski elements */}
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
              <div style={{ position: "absolute", top: 12, right: 16, display: "flex", alignItems: "center", gap: 6, background: "rgba(244,63,94,0.2)", padding: "4px 10px", borderRadius: 20 }}>
                {Icons.live}
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.pink, letterSpacing: 0.5 }}>LIVE</span>
              </div>
              <span style={{ fontSize: 32 }}>⛷️</span>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: COLORS.pink, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Trwają teraz
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Rejestruj swoje narciarskie aktywności!</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>12 uczestników online</div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* REFACTORED: Bottom Nav — floating pill style */}
      <div
        style={{
          position: "absolute", bottom: 16, left: 16, right: 16,
          background: "rgba(17, 24, 39, 0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: 24, padding: "8px 6px",
          display: "flex", justifyContent: "space-around",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 -4px 30px rgba(0,0,0,0.4)",
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.name;
          const isRecord = t.name === "Record";
          return (
            <button
              key={t.name}
              onClick={() => setActiveTab(t.name)}
              style={{
                background: isRecord
                  ? `linear-gradient(135deg, ${COLORS.accent}, #059669)`
                  : isActive
                  ? COLORS.accentDim
                  : "transparent",
                border: "none",
                borderRadius: isRecord ? 18 : 14,
                width: isRecord ? 52 : 56,
                height: isRecord ? 42 : 42,
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2,
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: isRecord ? 20 : 16, lineHeight: 1 }}>{t.icon}</span>
              {!isRecord && (
                <span
                  style={{
                    fontSize: 9, fontWeight: isActive ? 700 : 500,
                    color: isActive ? COLORS.accent : COLORS.textMuted,
                    letterSpacing: 0.3,
                  }}
                >
                  {t.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
