import React, { useRef, useEffect } from "react";
import "./StatCard1.css";

// ── Mini sparkline (canvas-based) ────────────────────────────────────────────
const Sparkline = ({ data = [], color = "#fff", width = 120, height = 50 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!data.length) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);

    const toY = (v) => height - ((v - min) / range) * (height * 0.7) - height * 0.1;

    ctx.beginPath();
    ctx.moveTo(0, toY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const cx = (i - 0.5) * stepX;
      const cy = toY(data[i - 1]);
      const x = i * stepX;
      const y = toY(data[i]);
      ctx.bezierCurveTo(cx, cy, cx, y, x, y);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }, [data, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
      className="sc-sparkline"
    />
  );
};

// ── Trend Badge ───────────────────────────────────────────────────────────────
const TrendBadge = ({ direction = "up" }) => (
  <span className={`sc-trend sc-trend--${direction}`}>
    {direction === "up" ? (
      // Arrow up-right
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 8L8 2M8 2H3M8 2V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      // Arrow down
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
);

// ── Tab Toggle ────────────────────────────────────────────────────────────────
const TabToggle = ({ tabs = [], active, onChange, accentColor }) => (
  <div className="sc-tabs">
    {tabs.map((t) => (
      <button
        key={t}
        className={`sc-tab ${active === t ? "sc-tab--active" : ""}`}
        style={active === t ? { backgroundColor: accentColor } : {}}
        onClick={() => onChange && onChange(t)}
      >
        {t}
      </button>
    ))}
  </div>
);

// ── StatCard ──────────────────────────────────────────────────────────────────
/**
 * Props
 * ─────
 * gradient        string | string[]   CSS gradient or [from, to] stops
 * icon            ReactNode           Icon element displayed top-left
 * menuIcon        ReactNode           Icon displayed top-right (optional)
 * value           string | number     Primary metric value
 * label           string              Subtitle label
 * trend           "up" | "down"       Trend direction badge
 * sparklineData   number[]            Data for sparkline chart
 * sparklineColor  string              Sparkline stroke color
 * tabs            string[]            Tab labels (e.g. ["Month","Year"])
 * activeTab       string              Controlled active tab
 * onTabChange     fn(tab)             Callback when tab changes
 * accentColor     string              Active tab bg / accent color
 * width           number | string     Card width (default "100%")
 * height          number | string     Card height (default 140)
 * className       string              Extra class names
 * style           object              Inline styles override
 */
const StatCard = ({
  gradient = ["#7c3aed", "#4f46e5"],
  icon,
  menuIcon,
  value = "$0",
  label = "Label",
  trend = "up",
  sparklineData,
  sparklineColor = "rgba(255,255,255,0.85)",
  tabs,
  activeTab,
  onTabChange,
  accentColor = "rgba(255,255,255,0.25)",
  width = "100%",
  height = 140,
  className = "",
  style = {},
}) => {
  const bg = Array.isArray(gradient)
    ? `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`
    : gradient;

  return (
    <div
      className={`sc-card ${className}`}
      style={{ background: bg, width, height, ...style }}
    >
      {/* Decorative blobs */}
      <div className="sc-blob sc-blob--1" />
      <div className="sc-blob sc-blob--2" />

      {/* Top Row */}
      <div className="sc-top">
        {icon && <div className="sc-icon-wrap">{icon}</div>}
        <div className="sc-top-right">
          {tabs && tabs.length > 0 && (
            <TabToggle
              tabs={tabs}
              active={activeTab}
              onChange={onTabChange}
              accentColor={accentColor}
            />
          )}
          {!tabs && menuIcon && <div className="sc-menu">{menuIcon}</div>}
        </div>
      </div>

      {/* Body */}
      <div className="sc-body">
        <div className="sc-body-left">
          <div className="sc-value-row">
            <span className="sc-value">{value}</span>
            <TrendBadge direction={trend} />
          </div>
          <span className="sc-label">{label}</span>
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="sc-chart">
            <Sparkline
              data={sparklineData}
              color={sparklineColor}
              width={120}
              height={50}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
export { Sparkline, TrendBadge, TabToggle };