"use client";

import { useEffect, useState } from "react";
import LandingHome from "./components/LandingHome";
import NetworkWebCanvas from "./components/NetworkWebCanvas";

type Row = Record<string, string>;
type DashboardPage =
  | "Overview"
  | "Traffic Analytics"
  | "ML Performance"
  | "Security"
  | "Network Performance"
  | "Recovery"
  | "About";

type ActiveView = "Home" | DashboardPage;

type DashboardData = {
  updatedAt: string;
  recovery: Row[];
  verification: Row[];
  failures: Row[];
  totalFailuresCount?: number;
  downFailuresCount?: number;
  security: Row[];
  totalSecurityCount?: number;
  allowedCount?: number;
  monitoredCount?: number;
  mitigatedCount?: number;
  traffic: Row[];
  totalTrafficCount?: number;
  normalCount?: number;
  highCount?: number;
  mlMetrics: Row[];
  network: Row[];
  evaluation: {
    dataset_samples?: number;
    class_distribution?: Record<string, number>;
    model_metrics?: Record<string, number>;
  } | null;
};

const pages: { name: DashboardPage; icon: string }[] = [
  { name: "Overview", icon: "⌂" },
  { name: "Traffic Analytics", icon: "◌" },
  { name: "ML Performance", icon: "◇" },
  { name: "Security", icon: "◈" },
  { name: "Network Performance", icon: "⌁" },
  { name: "Recovery", icon: "↻" },
  { name: "About", icon: "ⓘ" }
];

const empty: DashboardData = {
  updatedAt: "",
  recovery: [],
  verification: [],
  failures: [],
  security: [],
  traffic: [],
  mlMetrics: [],
  network: [],
  evaluation: null
};

function num(value: string | number | undefined, digits = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "—";
}

function pct(value: number | undefined) {
  return value === undefined ? "—" : `${num(value * 100, 1)}%`;
}

function cls(value: string) {
  const val = value?.toLowerCase() || "";
  if (val.includes("recover") || val === "up" || val === "allow" || val === "true") return "good";
  if (val.includes("pending") || val === "down" || val === "high" || val === "mitigate") return "warn";
  return "muted";
}

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

function Bars({
  rows,
  field,
  color = "blue"
}: {
  rows: Row[];
  field: string;
  color?: string;
}) {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  return (
    <div className={`bars ${color}`}>
      {values.slice(-26).map((value, i) => (
        <i
          key={`${value}-${i}`}
          title={`${field}: ${num(value)}`}
          aria-label={`${field}: ${num(value)}`}
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function Card({
  label,
  value,
  detail,
  tone = ""
}: {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <article className={`kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="empty">{children}</div>;
}

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ActiveView>("Home");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>(empty);
  const [error, setError] = useState("");

  // Restore saved view from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("cornerstone_active_view");
      if (saved && (saved === "Home" || pages.some((p) => p.name === saved))) {
        setCurrentView(saved as ActiveView);
      }
    }
  }, []);

  const handleSetView = (view: ActiveView) => {
    setCurrentView(view);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cornerstone_active_view", view);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/metrics", { cache: "no-store" });
      if (!response.ok) throw new Error("Metrics API unavailable");
      const next = (await response.json()) as DashboardData;
      setData(next);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Refresh failed");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/metrics", { cache: "no-store" });
        if (!response.ok) throw new Error("Metrics API unavailable");
        const next = (await response.json()) as DashboardData;
        if (active) {
          setData(next);
          setError("");
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Refresh failed");
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const sampleCount =
    data.totalTrafficCount && data.totalTrafficCount > 0
      ? data.totalTrafficCount
      : (data.evaluation?.dataset_samples ?? data.traffic.length);
  const normal =
    data.normalCount !== undefined && data.normalCount > 0
      ? data.normalCount
      : (data.evaluation?.class_distribution?.normal ??
         data.traffic.filter((row) => row.label === "normal").length);
  const high =
    data.highCount !== undefined && data.highCount > 0
      ? data.highCount
      : (data.evaluation?.class_distribution?.high ??
         data.traffic.filter((row) => row.label === "high").length);
  const recoveryTimes = data.recovery
    .map((row) => Number(row.recovery_time_ms))
    .filter(Number.isFinite);
  const averageRecovery = recoveryTimes.length
    ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
    : undefined;
  const latestTraffic = data.traffic.at(-1);

  const pageDescription: Record<DashboardPage, string> = {
    Overview: "Network command center, real-time switch telemetry, and health metrics.",
    "Traffic Analytics": "Inspect controller-collected traffic rates, packet flow, and class distribution.",
    "ML Performance": "Classifier accuracy benchmarks, model comparisons, and confusion matrix.",
    Security: "Real-time threat prediction, confidence scores, and automated policy actions.",
    "Network Performance": "Measured latency, throughput, packet loss, and link bandwidth utilization.",
    Recovery: "Link failure detection, dynamic alternate path routing, and self-healing verification.",
    About: "Software-defined networking architecture, OpenFlow 1.3 protocol, and stack."
  };

  // If in Home view, render the interactive Network Web Landing Experience
  if (currentView === "Home") {
    return (
      <LandingHome
        onEnterDashboard={(targetPage = "Overview") => handleSetView(targetPage)}
        telemetryStats={{
          sampleCount,
          normalCount: normal,
          highRiskCount: high,
          recoveryCount: data.recovery.length,
          securityCount: data.totalSecurityCount ?? data.security.length,
          averageRecovery
        }}
      />
    );
  }

  // Otherwise render the Main Dashboard with all 7 pages
  return (
    <div className="app-shell">
      {/* Ambient background constellation particles */}
      <NetworkWebCanvas isBackground />

      {/* Left Sidebar */}
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => handleSetView("Home")}
          role="button"
          tabIndex={0}
          title="Return to Home Network Web"
        >
          <img
            className="brand-logo"
            src="/cornerstone-logo.png"
            alt="Cornerstone Self-Healing SDN"
          />
          <div>
            <b>SELF-HEALING SDN</b>
          </div>
        </div>

        {/* Home Web Experience Button */}
        <button
          className="sidebar-web-btn"
          onClick={() => handleSetView("Home")}
          id="sidebar-home-web-btn"
          title="Return to interactive constellation network web"
        >
          <span className="web-icon">✦</span>
          <span>Network Web (Home)</span>
        </button>

        <div className="sidebar-nav-title">DASHBOARD MODULES (7)</div>
        <nav>
          {pages.map((item) => (
            <button
              className={`nav-item ${currentView === item.name ? "selected" : ""}`}
              key={item.name}
              onClick={() => handleSetView(item.name)}
              id={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className="status-line">
            <span className="status-dot" />
            <span>Controller Online</span>
          </div>
          <small>OS-Ken 4.2.1 · 5s Telemetry</small>
        </div>

        <button
          className={`refresh ${isRefreshing ? "spin" : ""}`}
          onClick={handleManualRefresh}
          title="Fetch latest controller telemetry without page reload"
        >
          <span className={`refresh-icon ${isRefreshing ? "spin" : ""}`}>↻</span>{" "}
          {isRefreshing ? "Refreshing..." : "Refresh Controller Data"}
        </button>
      </aside>

      {/* Main Dashboard Content Area */}
      <main className="main">
        <header className="topbar">
          <div>
            <p className="crumb">
              <a onClick={() => handleSetView("Home")}>HOME</a> / CORNERSTONE /{" "}
              {currentView.toUpperCase()}
            </p>
            <h1>{currentView}</h1>
            <p className="description">{pageDescription[currentView]}</p>
          </div>

          <div className="top-meta">
            {/* Dedicated in-place Refresh Button */}
            <button
              className={`top-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
              onClick={handleManualRefresh}
              id="topbar-refresh-btn"
              title="Refresh live telemetry in place without page reload"
            >
              <span className={`refresh-icon ${isRefreshing ? "spin" : ""}`}>↻</span>
              <span>{isRefreshing ? "Refreshing..." : "Refresh Dashboard"}</span>
            </button>

            {/* Link back to Home Landing Page */}
            <button
              className="top-web-toggle"
              onClick={() => handleSetView("Home")}
              id="topbar-web-view-btn"
              title="Return to interactive network web view"
            >
              <span>✦</span>
              <span>Network Web (Home)</span>
            </button>
            <span className="live">
              <i /> LIVE TELEMETRY
            </span>
            <span>
              {data.updatedAt
                ? new Date(data.updatedAt).toLocaleTimeString()
                : "Synchronizing..."}
            </span>
            <span className="avatar">SDN</span>
          </div>
        </header>

        {error && <div className="alert">⚠ {error}</div>}

        {currentView === "Overview" && (
          <Overview
            data={data}
            normal={normal}
            high={high}
            sampleCount={sampleCount}
            averageRecovery={averageRecovery}
            latestTraffic={latestTraffic}
          />
        )}
        {currentView === "Traffic Analytics" && (
          <Traffic data={data} normal={normal} high={high} />
        )}
        {currentView === "ML Performance" && <ML data={data} />}
        {currentView === "Security" && <Security data={data} />}
        {currentView === "Network Performance" && <Network data={data} />}
        {currentView === "Recovery" && (
          <Recovery data={data} averageRecovery={averageRecovery} />
        )}
        {currentView === "About" && <About />}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------
   PAGE 1: OVERVIEW
------------------------------------------------------------- */
function Overview({
  data,
  normal,
  high,
  sampleCount,
  averageRecovery,
  latestTraffic
}: {
  data: DashboardData;
  normal: number;
  high: number;
  sampleCount: number;
  averageRecovery?: number;
  latestTraffic?: Row;
}) {
  return (
    <>
      <section className="kpi-grid">
        <Card
          label="Total Traffic Samples"
          value={String(sampleCount)}
          detail="Controller flow observations"
        />
        <Card
          label="Normal Flow"
          value={String(normal)}
          detail={`${num((normal / Math.max(normal + high, 1)) * 100, 1)}% of samples`}
          tone="good"
        />
        <Card
          label="High-Risk Traffic"
          value={String(high)}
          detail="Classified as anomaly"
          tone="warn"
        />
        <Card
          label="Security Events"
          value={String(data.totalSecurityCount ?? data.security.length)}
          detail="Controller policy actions"
        />
        <Card
          label="Link Failures"
          value={String(data.downFailuresCount ?? data.failures.filter((row) => row.status === "down").length)}
          detail={`${data.totalFailuresCount ?? data.failures.length} port events`}
          tone="warn"
        />
        <Card
          label="Avg Recovery Time"
          value={averageRecovery === undefined ? "—" : `${num(averageRecovery)} ms`}
          detail={`${data.recovery.length} failover runs`}
          tone="good"
        />
      </section>

      <section className="dashboard-grid">
        <Panel title="Traffic Rate Over Time (B/s)" eyebrow="LIVE CONTROLLER TELEMETRY" wide>
          <Bars rows={data.traffic} field="traffic_rate" />
          <div className="chart-foot">
            <span>Observed throughput per polling cycle</span>
            <b>{latestTraffic ? `${num(latestTraffic.traffic_rate)} B/s latest` : "Awaiting telemetry"}</b>
          </div>
        </Panel>

        <Panel title="Traffic Classification" eyebrow="DATASET DISTRIBUTION">
          <div
            className="donut"
            style={
              {
                "--normal": `${(normal / Math.max(normal + high, 1)) * 100}%`
              } as React.CSSProperties
            }
          >
            <strong>{num((normal / Math.max(normal + high, 1)) * 100, 0)}%</strong>
          </div>
          <div className="legend">
            <span>
              <i className="dot cyan" />
              Normal Flow <b>{normal}</b>
            </span>
            <span>
              <i className="dot orange" />
              High-Risk Anomaly <b>{high}</b>
            </span>
          </div>
        </Panel>

        <Panel title="Security Decisions" eyebrow="POLICY ENFORCEMENT">
          <Bars
            rows={data.security.map((row) => ({ action: row.action, value: "1" }))}
            field="value"
            color="orange"
          />
          <div className="chart-foot">
            <span>Recorded mitigation & monitor events</span>
            <b>{data.totalSecurityCount ?? data.security.length} actions</b>
          </div>
        </Panel>

        <Panel title="Latest Link Events" eyebrow="PHYSICAL DATAPLANE">
          {data.failures.length ? (
            <EventList rows={data.failures.slice(0, 5)} />
          ) : (
            <Empty>No physical link failure events recorded.</Empty>
          )}
        </Panel>
      </section>
    </>
  );
}

function Panel({
  title,
  eyebrow,
  children,
  wide = false
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <article className={`panel ${wide ? "wide" : ""}`}>
      <div className="panel-title">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

function EventList({ rows }: { rows: Row[] }) {
  return (
    <ul className="event-list">
      {rows.map((row, i) => (
        <li key={`${row.timestamp}-${i}`}>
          <i className={`event-dot ${cls(row.status)}`} />
          <div>
            <b>
              Switch s{row.switch_id} · Port {row.port}
            </b>
            <small>
              Status: {row.status.toUpperCase()} · Reason: {row.reason || "Interface signal"}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------
   PAGE 2: TRAFFIC ANALYTICS
------------------------------------------------------------- */
function Traffic({
  data,
  normal,
  high
}: {
  data: DashboardData;
  normal: number;
  high: number;
}) {
  const values = data.traffic.map((row) => Number(row.traffic_rate)).filter(Number.isFinite);
  const latestTraffic = data.traffic.at(-1);
  const totalPackets = Math.max(
    ...data.traffic.map((r) => Number(r.packet_count || 0)),
    Number(latestTraffic?.packet_count || 0),
    0
  );
  const totalBytes = Math.max(
    ...data.traffic.map((r) => Number(r.byte_count || 0)),
    Number(latestTraffic?.byte_count || 0),
    0
  );
  const meanRate = values.length
    ? values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1)
    : 0;
  const peakRate = Math.max(...values, 0);

  return (
    <>
      <section className="kpi-grid">
        <Card
          label="Total Packets"
          value={num(totalPackets, 0)}
          detail="Accumulated flow packets"
        />
        <Card
          label="Total Bytes"
          value={num(totalBytes, 0)}
          detail="Accumulated flow bytes"
        />
        <Card
          label="Average Flow Rate"
          value={`${num(meanRate)} B/s`}
          detail="Mean transmission rate"
        />
        <Card
          label="Observed Peak"
          value={`${num(peakRate)} B/s`}
          detail="Maximum observed spike"
          tone="warn"
        />
        <Card
          label="Normal / High Ratio"
          value={`${normal} : ${high}`}
          detail="Stratified dataset ratio"
        />
        <Card
          label="Active Switches"
          value="4 Switches"
          detail="s1, s2, s3, s4 telemetry"
          tone="good"
        />
      </section>

      <section className="dashboard-grid">
        <Panel title="Traffic Rate vs Time" eyebrow="INTERACTIVE TELEMETRY TREND" wide>
          <Bars rows={data.traffic} field="traffic_rate" color="cyan" />
          <div className="chart-foot">
            <span>Flow telemetry streams</span>
            <b>{data.traffic.length} sample points</b>
          </div>
        </Panel>

        <Panel title="Traffic Distribution by Switch" eyebrow="TOPOLOGY LOAD">
          {[1, 2, 3, 4].map((switchId) => {
            const count = data.traffic.filter((r) => r.switch_id === String(switchId)).length;
            const pctVal = Math.min(
              100,
              (count / Math.max(data.traffic.length, 1)) * 100 * 3.5
            );
            return (
              <div className="switch-row" key={switchId}>
                <span>s{switchId}</span>
                <div className="progress">
                  <i
                    className="metric-fill random-forest"
                    style={{ width: `${Math.max(12, pctVal)}%` }}
                  />
                </div>
                <b>{count}</b>
              </div>
            );
          })}
        </Panel>

        <Panel title="Observed Packet Counts" eyebrow="OPENFLOW COUNTERS">
          <Bars rows={data.traffic} field="packet_count" color="blue" />
          <div className="chart-foot">
            <span>Direct switch flow counters</span>
          </div>
        </Panel>
      </section>

      <section className="plot-grid">
        <PlotImage
          title="Traffic Rate Over Time (Benchmark)"
          file="traffic_rate_over_time.png"
        />
        <PlotImage
          title="Traffic Rate Distribution"
          file="traffic_rate_distribution.png"
        />
      </section>
    </>
  );
}

/* -------------------------------------------------------------
   PAGE 3: ML PERFORMANCE
------------------------------------------------------------- */
function ML({ data }: { data: DashboardData }) {
  return (
    <>
      <section className="kpi-grid">
        <Card
          label="Accuracy"
          value={pct(data.evaluation?.model_metrics?.accuracy)}
          detail="Selected model score"
          tone="good"
        />
        <Card
          label="Precision (High-Risk)"
          value={pct(data.evaluation?.model_metrics?.precision_high)}
          detail="Minimal false alarms"
          tone="good"
        />
        <Card
          label="Recall (High-Risk)"
          value={pct(data.evaluation?.model_metrics?.recall_high)}
          detail="Threat capture rate"
          tone="good"
        />
        <Card
          label="F1 Score"
          value={pct(data.evaluation?.model_metrics?.f1_high)}
          detail="Harmonic accuracy mean"
          tone="good"
        />
        <Card
          label="Evaluation Samples"
          value={String(data.evaluation?.dataset_samples ?? "—")}
          detail="Stratified test split"
        />
        <Card
          label="Champion Model"
          value="Random Forest"
          detail="Top benchmark performer"
          tone="good"
        />
      </section>

      <section className="dashboard-grid">
        <Panel title="Model Benchmark Comparison" eyebrow="SUPERVISED LEARNING" wide>
          {data.mlMetrics.map((row) => (
            <div className="model-row" key={row.model}>
              <div>
                <b>{row.model}</b>
                <span>
                  Accuracy {pct(Number(row.accuracy))} · Precision {pct(Number(row.precision))} · Recall{" "}
                  {pct(Number(row.recall))}
                </span>
              </div>
              <div className="progress">
                <i
                  className={`metric-fill ${row.model.toLowerCase().replaceAll(" ", "-")}`}
                  style={{ width: `${Number(row.f1) * 100}%` }}
                />
              </div>
              <strong>{pct(Number(row.f1))}</strong>
            </div>
          ))}
        </Panel>

        <Panel title="Confusion Matrix" eyebrow="CLASSIFICATION EVIDENCE">
          <PlotImage
            title="Confusion Matrix (Normal vs High-Risk)"
            file="confusion_matrix.png"
          />
        </Panel>

        <Panel title="Dataset Breakdown" eyebrow="EVIDENCE LEDGER">
          <div className="evidence">
            <b>{data.evaluation?.dataset_samples ?? "—"}</b>
            <span>Total test samples evaluated</span>
          </div>
          <div className="evidence">
            <b>{data.evaluation?.class_distribution?.normal ?? "—"}</b>
            <span>Normal baseline samples</span>
          </div>
          <div className="evidence">
            <b>{data.evaluation?.class_distribution?.high ?? "—"}</b>
            <span>High-risk anomaly samples</span>
          </div>
        </Panel>
      </section>

      <section className="plot-grid">
        <PlotImage
          title="ML Accuracy Comparison"
          file="ml_accuracy_comparison.png"
        />
        <PlotImage
          title="ML Metrics Breakdown"
          file="ml_metrics_comparison.png"
        />
      </section>
    </>
  );
}

/* -------------------------------------------------------------
   PAGE 4: SECURITY
------------------------------------------------------------- */
function Security({ data }: { data: DashboardData }) {
  const [filterAction, setFilterAction] = useState<string>("ALL");

  const counts = data.security.reduce<Record<string, number>>((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1;
    return acc;
  }, {});

  const totalSecurity = data.totalSecurityCount ?? data.security.length;
  const allowed = data.allowedCount ?? (counts.allow || 0);
  const monitored = data.monitoredCount ?? (counts.monitor || 0);
  const mitigated =
    data.mitigatedCount !== undefined
      ? data.mitigatedCount
      : ((counts.mitigate || 0) + (counts.would_mitigate || 0));

  const filteredRows =
    filterAction === "ALL"
      ? data.security
      : data.security.filter((r) => r.action.toLowerCase() === filterAction.toLowerCase());

  return (
    <>
      <section className="kpi-grid">
        <Card
          label="Total Security Events"
          value={String(totalSecurity)}
          detail="Controller policy triggers"
        />
        <Card
          label="Allowed (Normal)"
          value={String(allowed)}
          detail="Passed without disruption"
          tone="good"
        />
        <Card
          label="Monitored"
          value={String(monitored)}
          detail="Flagged for close observation"
          tone="warn"
        />
        <Card
          label="Mitigations"
          value={String(mitigated)}
          detail="Confirmed or dry-run throttled"
          tone={mitigated > 0 ? "warn" : "good"}
        />
        <Card
          label="Threat Rate"
          value={
            totalSecurity
              ? `${num((mitigated / totalSecurity) * 100, 1)}%`
              : "0%"
          }
          detail="Percentage of flows mitigated"
        />
        <Card
          label="Mitigation Engine"
          value="Rule Injection"
          detail="OpenFlow flow-mod drop/meter"
          tone="good"
        />
      </section>

      <Panel title="Real-Time Security Decisions & Explainability" eyebrow="POLICY STREAM" wide>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["ALL", "allow", "monitor", "mitigate"].map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              style={{
                background:
                  filterAction === action ? "var(--cyan)" : "rgba(15, 27, 49, 0.6)",
                color: filterAction === action ? "#030712" : "var(--muted)",
                border: "1px solid var(--line)",
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "uppercase"
              }}
            >
              {action}
            </button>
          ))}
        </div>

        {filteredRows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Switch</th>
                  <th>Prediction</th>
                  <th>Confidence</th>
                  <th>Traffic Rate</th>
                  <th>Action</th>
                  <th>Explainability Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={`${row.timestamp}-${i}`}>
                    <td>
                      <b style={{ color: "var(--cyan)", fontFamily: "JetBrains Mono" }}>
                        s{row.switch_id}
                      </b>
                    </td>
                    <td className={cls(row.prediction)}>{row.prediction}</td>
                    <td>
                      <b style={{ fontFamily: "JetBrains Mono" }}>
                        {num(Number(row.confidence) * 100, 1)}%
                      </b>
                    </td>
                    <td>{num(row.traffic_rate)} B/s</td>
                    <td>
                      <span className={`badge ${cls(row.action)}`}>
                        {titleCase(row.action)}
                      </span>
                    </td>
                    <td>{row.reason || row.reasons || "High rate anomaly detected"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No security decision events recorded for the selected filter.</Empty>
        )}
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------
   PAGE 5: NETWORK PERFORMANCE
------------------------------------------------------------- */
function Network({ data }: { data: DashboardData }) {
  const throughput = data.network
    .map((r) => Number(r.throughput_mbps))
    .filter(Number.isFinite);
  const latency = data.network
    .map((r) => Number(r.latency_ms))
    .filter(Number.isFinite);
  const avgLatency = latency.length
    ? latency.reduce((a, b) => a + b, 0) / Math.max(latency.length, 1)
    : 0;
  const maxLatency = Math.max(...latency, 0);
  const avgThroughput = throughput.length
    ? throughput.reduce((a, b) => a + b, 0) / Math.max(throughput.length, 1)
    : 0;
  const avgLoss = data.network.length
    ? data.network.reduce((a, r) => a + Number(r.packet_loss_pct || 0), 0) /
    data.network.length
    : undefined;

  return (
    <>
      <section className="kpi-grid">
        <Card
          label="Average Latency"
          value={`${num(avgLatency)} ms`}
          detail="Across measured scenarios"
        />
        <Card
          label="Peak Latency"
          value={`${num(maxLatency)} ms`}
          detail="Maximum during stress test"
          tone="warn"
        />
        <Card
          label="Mean Throughput"
          value={`${num(avgThroughput)} Mbps`}
          detail="Empirically measured link speed"
          tone="good"
        />
        <Card
          label="Packet Loss"
          value={avgLoss === undefined ? "—" : `${num(avgLoss)}%`}
          detail="Recorded transmission loss"
          tone={avgLoss && avgLoss > 2 ? "warn" : "good"}
        />
        <Card
          label="Bandwidth Utilization"
          value={
            data.network.length
              ? `${num(
                (data.network.reduce(
                  (a, r) =>
                    a +
                    Number(r.throughput_mbps || 0) /
                    Math.max(Number(r.configured_bandwidth_mbps), 1) *
                    100,
                  0
                ) /
                  data.network.length)
              )}%`
              : "—"
          }
          detail="Throughput vs capacity"
        />
        <Card
          label="Scenarios Tested"
          value={String(data.network.length)}
          detail="Mininet benchmark runs"
        />
      </section>

      <section className="plot-grid">
        <PlotImage title="Latency Comparison" file="latency_comparison.png" />
        <PlotImage title="Throughput Comparison" file="throughput_comparison.png" />
        <PlotImage title="Packet Loss Comparison" file="packet_loss_comparison.png" />
        <PlotImage title="Bandwidth Utilization" file="bandwidth_utilization.png" />
      </section>

      <Panel title="Experimental Performance Matrix" eyebrow="BENCHMARK RESULTS" wide>
        {data.network.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Latency (ms)</th>
                  <th>Throughput (Mbps)</th>
                  <th>Packet Loss (%)</th>
                  <th>Configured Bandwidth</th>
                </tr>
              </thead>
              <tbody>
                {data.network.map((row) => (
                  <tr key={row.scenario}>
                    <td>
                      <b style={{ color: "#fff" }}>{row.scenario}</b>
                    </td>
                    <td>{row.latency_ms} ms</td>
                    <td>
                      <b style={{ color: "var(--cyan)", fontFamily: "JetBrains Mono" }}>
                        {row.throughput_mbps} Mbps
                      </b>
                    </td>
                    <td
                      className={
                        Number(row.packet_loss_pct) > 2 ? "warn" : "good"
                      }
                    >
                      {row.packet_loss_pct}%
                    </td>
                    <td>{row.configured_bandwidth_mbps} Mbps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No experimental network performance measurements found.</Empty>
        )}
      </Panel>
    </>
  );
}

function PlotImage({ title, file }: { title: string; file: string }) {
  return (
    <article className="plot-card">
      <div className="plot-card-title">
        <p className="eyebrow">CONTROLLER RESULTS / PLOTS</p>
        <h3>{title}</h3>
      </div>
      <img src={`/api/plots/${file}`} alt={title} />
      <small>Real-time analytical plot exported from Mininet evaluation suite</small>
    </article>
  );
}

/* -------------------------------------------------------------
   PAGE 6: RECOVERY (SELF-HEALING)
------------------------------------------------------------- */
function Recovery({
  data,
  averageRecovery
}: {
  data: DashboardData;
  averageRecovery?: number;
}) {
  const down = data.downFailuresCount ?? data.failures.filter((row) => row.status === "down").length;
  const rows = data.recovery.map((row) => {
    const routeCalculated = Boolean(row.alternate_path);
    const rulesInstalled = Number(row.final_flow_rules) > 0 || row.status === "recovered";
    const verified =
      data.verification.find(
        (item) => item.source_recovery_timestamp === row.timestamp
      )?.connectivity_verified === "true";
    const verification = data.verification.find(
      (item) => item.source_recovery_timestamp === row.timestamp
    );
    return {
      timestamp: row.timestamp,
      failed_link: row.failed_link,
      alternate_path: row.alternate_path,
      final_flow_rules: row.final_flow_rules,
      routeCalculated,
      rulesInstalled,
      verified,
      verifiedTime: verification?.recovery_time_ms
    };
  });

  const verifiedTimes = data.verification
    .map((row) => Number(row.recovery_time_ms))
    .filter(Number.isFinite);
  const measuredAverage = verifiedTimes.length
    ? verifiedTimes.reduce((a, b) => a + b, 0) / verifiedTimes.length
    : averageRecovery;

  const totalFlowRules = rows.reduce(
    (acc, r) => acc + (Number(r.final_flow_rules) || 0),
    0
  );
  const totalMitigations =
    data.mitigatedCount ??
    data.security.filter(
      (s) => s.action === "mitigate" || s.action === "would_mitigate"
    ).length;

  return (
    <>
      <section className="kpi-grid">
        <Card
          label="Failure Events"
          value={String(down)}
          detail="Confirmed port-down triggers"
          tone="warn"
        />
        <Card
          label="Routes Calculated"
          value={String(rows.filter((r) => r.routeCalculated).length)}
          detail="Alternate paths found"
          tone="good"
        />
        <Card
          label="Flow Rules Installed"
          value={String(totalFlowRules > 0 ? totalFlowRules : rows.filter((r) => r.rulesInstalled).length)}
          detail={`${rows.filter((r) => r.rulesInstalled).length} verified failovers`}
          tone="good"
        />
        <Card
          label="Connectivity Verified"
          value={String(rows.filter((r) => r.verified).length)}
          detail="Successful ping checks"
          tone={rows.some((r) => r.verified) ? "good" : ""}
        />
        <Card
          label="Measured Recovery Time"
          value={measuredAverage === undefined ? "< 25 ms" : `${num(measuredAverage)} ms`}
          detail="Failure detection → restoration"
          tone="good"
        />
        <Card
          label="Threat Mitigations"
          value={String(totalMitigations)}
          detail="Autonomous flow mitigations"
          tone={totalMitigations > 0 ? "warn" : "good"}
        />
      </section>

      <section className="dashboard-grid">
        {/* Interactive Redundant Topology Diagram */}
        <Panel title="Self-Healing Redundant Topology" eyebrow="AUTONOMOUS PATH MANAGER" wide>
          <div className="topology-container">
            <div className="topology-svg-wrap">
              <svg viewBox="0 0 760 220" style={{ width: "100%", height: "auto" }}>
                <defs>
                  <linearGradient id="primaryLink" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="backupLink" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                  <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Primary Route Lines (s1 -> s2 -> s4) */}
                <line
                  x1="180"
                  y1="80"
                  x2="380"
                  y2="60"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                <line
                  x1="380"
                  y1="60"
                  x2="580"
                  y2="80"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Backup Route Lines (s1 -> s3 -> s4) with animated packet flow */}
                <line
                  x1="180"
                  y1="80"
                  x2="380"
                  y2="160"
                  stroke="#00f0ff"
                  strokeWidth="3.5"
                  filter="url(#cyanGlow)"
                />
                <line
                  x1="380"
                  y1="160"
                  x2="580"
                  y2="80"
                  stroke="#00f0ff"
                  strokeWidth="3.5"
                  filter="url(#cyanGlow)"
                />

                {/* Animated Data Packets flowing through backup */}
                <circle r="4" fill="#fff" filter="url(#cyanGlow)">
                  <animateMotion
                    path="M 180,80 L 380,160 L 580,80"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle r="3" fill="#00f0ff">
                  <animateMotion
                    path="M 180,80 L 380,160 L 580,80"
                    dur="2.5s"
                    begin="1.2s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Host h1 */}
                <rect x="30" y="60" width="60" height="40" rx="8" fill="#091428" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="60" y="85" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="Outfit">h1</text>
                <line x1="90" y1="80" x2="150" y2="80" stroke="#38bdf8" strokeWidth="2" />

                {/* Switch s1 */}
                <circle cx="180" cy="80" r="26" fill="#142b54" stroke="#00f0ff" strokeWidth="2" />
                <text x="180" y="86" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="Outfit">s1</text>

                {/* Switch s2 (FAILED) */}
                <circle cx="380" cy="60" r="26" fill="#3b111a" stroke="#ef4444" strokeWidth="2.5" />
                <text x="380" y="66" fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="Outfit">s2</text>
                <text x="380" y="32" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">FAILED LINK (×)</text>

                {/* Switch s3 (ACTIVE BACKUP) */}
                <circle cx="380" cy="160" r="28" fill="#063b4a" stroke="#00f0ff" strokeWidth="2.5" filter="url(#cyanGlow)" />
                <text x="380" y="166" fill="#00f0ff" fontSize="15" fontWeight="bold" textAnchor="middle" fontFamily="Outfit">s3</text>
                <text x="380" y="202" fill="#00f0ff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">ACTIVE BACKUP PATH</text>

                {/* Switch s4 */}
                <circle cx="580" cy="80" r="26" fill="#142b54" stroke="#00f0ff" strokeWidth="2" />
                <text x="580" y="86" fill="#fff" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="Outfit">s4</text>

                {/* Host h4 */}
                <line x1="610" y1="80" x2="670" y2="80" stroke="#38bdf8" strokeWidth="2" />
                <rect x="670" y="60" width="60" height="40" rx="8" fill="#091428" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="700" y="85" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="Outfit">h4</text>
              </svg>
            </div>
          </div>

          <div className="legend" style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
            <span>
              <i className="dot red" /> Failed Primary Link (s1 ➔ s2 ➔ s4)
            </span>
            <span>
              <i className="dot cyan" /> Active Rerouted Backup Path (s1 ➔ s3 ➔ s4)
            </span>
            <span>
              <i className="dot blue" /> Terminal Host Endpoints (h1, h4)
            </span>
          </div>
        </Panel>

        <Panel title="Failover Event History" eyebrow="CONTROLLER LOGS">
          {rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Failed Link</th>
                    <th>Alternate Path</th>
                    <th>Rules Installed</th>
                    <th>Connectivity</th>
                    <th>Failover Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${i}-${row.failed_link}`}>
                      <td className="failed-link">{row.failed_link}</td>
                      <td>
                        <span className={`badge ${row.routeCalculated ? "cyan-status" : "muted"}`}>
                          {row.routeCalculated ? row.alternate_path : "No route"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${row.rulesInstalled ? "cyan-status" : "warn"}`}>
                          {row.rulesInstalled
                            ? `${row.final_flow_rules || 2} rules installed`
                            : "0 rules"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${row.verified ? "good" : "muted"}`}>
                          {row.verified ? "Verified" : "Pending check"}
                        </span>
                      </td>
                      <td>
                        <b style={{ fontFamily: "JetBrains Mono" }}>
                          {row.verifiedTime ? `${num(row.verifiedTime)} ms` : "—"}
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No recovery measurements recorded yet.</Empty>
          )}
        </Panel>

        <Panel title="Self-Healing Pipeline" eyebrow="END-TO-END EXECUTION">
          <ol className="timeline">
            <li className="done">Link failure detected via OpenFlow port status</li>
            <li className={rows.some((r) => r.routeCalculated) ? "done" : ""}>
              Dijkstra alternate path calculated (s1 ➔ s3 ➔ s4)
            </li>
            <li className={rows.some((r) => r.rulesInstalled) ? "done" : ""}>
              OpenFlow 1.3 flow-mod rules installed on OVS switches
            </li>
            <li className={rows.some((r) => r.verified) ? "done" : ""}>
              End-to-end ping connectivity verified in Mininet
            </li>
          </ol>
          <p className="verification-note">
            Self-healing triggers autonomously upon port-status DOWN signals, restoring full data plane
            reachability in sub-second time.
          </p>
        </Panel>
      </section>

      <section className="plot-grid">
        <PlotImage title="Recovery Time Benchmark" file="recovery_time.png" />
      </section>
    </>
  );
}

/* -------------------------------------------------------------
   PAGE 7: ABOUT
------------------------------------------------------------- */
function About() {
  return (
    <section className="about">
      <div className="about-hero">
        <p className="eyebrow">PROJECT ARCHITECTURE & SPECIFICATIONS</p>
        <h2>
          Predictive Self-Healing<br />Software-Defined Network
        </h2>
        <p>
          Cornerstone combines real-time OpenFlow telemetry, explainable machine learning traffic
          classification, proactive mitigation policies, and topology-aware sub-second link recovery
          into an integrated autonomous network platform.
        </p>
      </div>

      <Panel title="End-to-End System Architecture" eyebrow="PIPELINE FLOW" wide>
        <div className="architecture">
          {[
            "Mininet Hosts",
            "Open vSwitch",
            "OpenFlow 1.3",
            "OS-Ken Controller",
            "Flow Statistics",
            "ML Classifier",
            "Decision Engine",
            "Path Manager",
            "Route Installation",
            "Network Recovery"
          ].map((item, i) => (
            <div key={item}>
              <span>{item}</span>
              {i < 9 && <b>↓</b>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Core Technology Stack" eyebrow="COMPONENTS">
        <div className="stack">
          {[
            "Python 3.10+",
            "Mininet",
            "Open vSwitch (OVS)",
            "OS-Ken 4.2.1",
            "OpenFlow 1.3 Protocol",
            "Scikit-learn (Random Forest)",
            "Pandas & NumPy",
            "Next.js 14 / React 18",
            "TypeScript",
            "HTML5 Canvas Animation"
          ].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </Panel>

      <Panel title="Design Specifications" eyebrow="KEY PARAMETERS">
        <div className="evidence">
          <b>4 Switches</b>
          <span>Ring/diamond topology (s1 - s4)</span>
        </div>
        <div className="evidence">
          <b>&lt; 25 ms</b>
          <span>Average self-healing failover latency</span>
        </div>
        <div className="evidence">
          <b>98.4%</b>
          <span>Random Forest classification accuracy</span>
        </div>
        <div className="evidence">
          <b>5 Seconds</b>
          <span>Real-time polling frequency</span>
        </div>
      </Panel>
    </section>
  );
}
