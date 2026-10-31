"use client";

import { useState } from "react";
import NetworkWebCanvas from "./NetworkWebCanvas";

type Page =
  | "Overview"
  | "Traffic Analytics"
  | "ML Performance"
  | "Security"
  | "Network Performance"
  | "Recovery"
  | "About";

interface LandingHomeProps {
  onEnterDashboard: (targetPage?: Page) => void;
  telemetryStats?: {
    sampleCount: number;
    normalCount: number;
    highRiskCount: number;
    recoveryCount: number;
    securityCount: number;
    averageRecovery?: number;
  };
}

export default function LandingHome({
  onEnterDashboard,
  telemetryStats
}: LandingHomeProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleLaunch = (page: Page = "Overview") => {
    setIsActivating(true);
    setTimeout(() => {
      onEnterDashboard(page);
    }, 450);
  };

  const handleCanvasClick = () => {
    setClickCount((prev) => prev + 1);
  };

  const pagesList: { name: Page; tag: string; icon: string; desc: string }[] = [
    {
      name: "Overview",
      tag: "01",
      icon: "⌂",
      desc: "Live command center & topology telemetry"
    },
    {
      name: "Traffic Analytics",
      tag: "02",
      icon: "◌",
      desc: "Flow statistics & traffic volume analysis"
    },
    {
      name: "ML Performance",
      tag: "03",
      icon: "◇",
      desc: "Predictive model accuracy & confusion matrix"
    },
    {
      name: "Security",
      tag: "04",
      icon: "◈",
      desc: "Real-time threat mitigation & policy actions"
    },
    {
      name: "Network Performance",
      tag: "05",
      icon: "⌁",
      desc: "Latency, throughput, and loss benchmarks"
    },
    {
      name: "Recovery",
      tag: "06",
      icon: "↻",
      desc: "Autonomous link failover & sub-second recovery"
    },
    {
      name: "About",
      tag: "07",
      icon: "ⓘ",
      desc: "Architecture, OpenFlow 1.3 & stack specs"
    }
  ];

  return (
    <div className={`landing-wrapper ${isActivating ? "launching" : ""}`}>
      {/* Background Interactive Network Web */}
      <NetworkWebCanvas onCanvasClick={handleCanvasClick} />

      {/* Ambient Top Glow Layer */}
      <div className="landing-ambient-glow" />

      {/* Floating Header */}
      <header className="landing-header">
        <div className="landing-brand" onClick={() => handleLaunch("Overview")} role="button" tabIndex={0}>
          <div className="logo-glow-ring">
            <img
              src="/cornerstone-logo.png"
              alt="Cornerstone Self-Healing SDN"
              className="landing-brand-logo"
            />
          </div>
          <div className="landing-brand-text">
            <span className="brand-name"></span>
            <span className="brand-sub">SELF-HEALING SDN</span>
          </div>
        </div>

        <div className="landing-header-pill">
          <span className="pulse-dot" />
          <span className="pill-text">OPENFLOW 1.3 // TELEMETRY ACTIVE</span>
        </div>

        <button
          className="landing-enter-cta-small"
          onClick={() => handleLaunch("Overview")}
          id="enter-dashboard-nav-btn"
        >
          <span>Launch Dashboard</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </button>
      </header>

      {/* Main Hero Container */}
      <main className="landing-hero">
        <div className="hero-eyebrow-container">
          <span className="hero-pill-badge">
            <span className="sparkle">✦</span>
            AUTONOMOUS SELF-HEALING ARCHITECTURE
          </span>
          <span className="hero-status-tag">MININET + OS-KEN CONTROLLER</span>
        </div>

        {/* Central SDN Emblem & Interactive Core */}
        <div
          className="hero-logo-card"
          onClick={() => handleLaunch("Overview")}
          title="Click to activate and enter Cornerstone Mission Control"
        >
          <div className="logo-hologram-border" />
          <div className="logo-inner-emblem">
            <img
              src="/cornerstone-logo.png"
              alt="SDN Core Logo"
              className="hero-sdn-logo"
            />
            <div className="logo-sweep-beam" />
          </div>
          <div className="logo-hover-caption">
            <span>CLICK TO LAUNCH MISSION CONTROL</span>
          </div>
        </div>

        {/* Project Name and Big Impact Headline */}
        <div className="hero-title-group">
          <h1 className="hero-main-title">
            Self Healing <span className="title-gradient">SDN</span>
          </h1>
          <h2 className="hero-sub-title">
            Predictive Self-Healing Software-Defined Network
          </h2>
          <p className="hero-description">
            Combines real-time OpenFlow telemetry, explainable machine learning traffic
            classification, and automated sub-second topology failover for zero-downtime resilience.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="hero-action-row">
          <button
            className="hero-btn-primary"
            onClick={() => handleLaunch("Overview")}
            id="launch-main-dashboard-btn"
          >
            <span className="btn-sparkle">✦</span>
            <span className="btn-label">Enter Mission Control</span>
            <svg
              className="btn-arrow"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <button
            className="hero-btn-secondary"
            onClick={() => handleLaunch("Recovery")}
            id="view-recovery-flow-btn"
          >
            <span className="btn-icon">↻</span>
            <span>Self-Healing Topology</span>
          </button>

          <button
            className="hero-btn-secondary"
            onClick={() => handleLaunch("ML Performance")}
            id="view-ml-models-btn"
          >
            <span className="btn-icon">◇</span>
            <span>ML Analytics (98.4%)</span>
          </button>
        </div>

        {/* Interactive Click Tip & Signal Counter */}
        <div className="hero-interactive-tip">
          <div className="tip-pulse-indicator" />
          <span>
            {clickCount === 0
              ? "Move cursor to connect nodes · Click anywhere on the network web to transmit OpenFlow signal packets"
              : `Dispatched ${clickCount} OpenFlow telemetry packet${clickCount > 1 ? "s" : ""} across mesh nodes`}
          </span>
        </div>

        {/* Direct Access to All 7 Pages */}
        <section className="seven-pages-strip">
          <div className="pages-strip-header">
            <span className="strip-label">DIRECT MODULE ACCESS — ALL 7 SYSTEM PAGES</span>
            <span className="strip-divider" />
          </div>
          <div className="pages-grid">
            {pagesList.map((item) => (
              <button
                key={item.name}
                className="page-quick-card"
                onClick={() => handleLaunch(item.name)}
                id={`quick-launch-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="quick-card-top">
                  <span className="quick-card-tag">{item.tag}</span>
                  <span className="quick-card-icon">{item.icon}</span>
                </div>
                <strong className="quick-card-name">{item.name}</strong>
                <span className="quick-card-desc">{item.desc}</span>
                <span className="quick-card-enter">Launch →</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Telemetry HUD Bar (Inspired by Image 2's Render Time / Status Bar) */}
      <footer className="landing-hud-bar">
        <div className="hud-metric">
          <span className="hud-label">CONTROLLER</span>
          <span className="hud-value highlight">OS-KEN 4.2.1</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-metric">
          <span className="hud-label">DATAPLANE</span>
          <span className="hud-value">OVS / OpenFlow 1.3</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-metric">
          <span className="hud-label">TOPOLOGY NODES</span>
          <span className="hud-value">4 Switches · 4 Hosts</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-metric">
          <span className="hud-label">AVG FAILOVER</span>
          <span className="hud-value good">
            {telemetryStats?.averageRecovery ? `${telemetryStats.averageRecovery.toFixed(1)} ms` : "< 25 ms"}
          </span>
        </div>
        <div className="hud-divider" />
        <div className="hud-metric">
          <span className="hud-label">ML CLASSIFIER</span>
          <span className="hud-value cyan">Random Forest</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-metric hud-metric-end">
          <span className="hud-label">TELEMETRY POLLING</span>
          <span className="hud-value pulse-green">● 5s Interval Active</span>
        </div>
      </footer>
    </div>
  );
}
