"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, string>;
type Page = "Overview" | "Traffic Analytics" | "ML Performance" | "Security" | "Network Performance" | "Recovery" | "About";
type DashboardData = {
  updatedAt: string;
  recovery: Row[];
  verification: Row[];
  failures: Row[];
  security: Row[];
  traffic: Row[];
  mlMetrics: Row[];
  network: Row[];
  evaluation: { dataset_samples?: number; class_distribution?: Record<string, number>; model_metrics?: Record<string, number> } | null;
};

const pages: { name: Page; icon: string }[] = [
  { name: "Overview", icon: "⌂" },
  { name: "Traffic Analytics", icon: "◌" },
  { name: "ML Performance", icon: "◇" },
  { name: "Security", icon: "◈" },
  { name: "Network Performance", icon: "⌁" },
  { name: "Recovery", icon: "↻" },
  { name: "About", icon: "ⓘ" }
];
const empty: DashboardData = { updatedAt: "", recovery: [], verification: [], failures: [], security: [], traffic: [], mlMetrics: [], network: [], evaluation: null };

function num(value: string | number | undefined, digits = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "—";
}
function pct(value: number | undefined) { return value === undefined ? "—" : `${num(value * 100, 1)}%`; }
function cls(value: string) { return value?.toLowerCase().includes("recover") || value === "up" || value === "allow" ? "good" : value?.toLowerCase().includes("pending") || value === "down" || value === "high" ? "warn" : "muted"; }
function titleCase(value: string) { return value.replaceAll("_", " "); }

function Bars({ rows, field, color = "blue" }: { rows: Row[]; field: string; color?: string }) {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  return <div className={`bars ${color}`}>{values.slice(-24).map((value, i) => <i key={`${value}-${i}`} title={`${field}: ${num(value)}`} aria-label={`${field}: ${num(value)}`} style={{ height: `${Math.max(7, value / max * 100)}%` }} />)}</div>;
}
function Card({ label, value, detail, tone = "" }: { label: string; value: string; detail: string; tone?: string }) {
  return <article className={`kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
function Empty({ children }: { children: string }) { return <div className="empty">{children}</div>; }

export default function Dashboard() {
  const [page, setPage] = useState<Page>("Overview");
  const [data, setData] = useState(empty);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/metrics", { cache: "no-store" });
        if (!response.ok) throw new Error("Metrics API unavailable");
        const next = await response.json() as DashboardData;
        if (active) { setData(next); setError(""); }
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Refresh failed"); }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const sampleCount = data.traffic.length;
  const normal = data.evaluation?.class_distribution?.normal ?? data.traffic.filter((row) => row.label === "normal").length;
  const high = data.evaluation?.class_distribution?.high ?? data.traffic.filter((row) => row.label === "high").length;
  const recoveryTimes = data.recovery.map((row) => Number(row.recovery_time_ms)).filter(Number.isFinite);
  const averageRecovery = recoveryTimes.length ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length : undefined;
  const latestTraffic = data.traffic.at(-1);
  const pageDescription: Record<Page, string> = {
    Overview: "Network command center and system health at a glance.",
    "Traffic Analytics": "Inspect controller-collected traffic and classification patterns.",
    "ML Performance": "Compare model quality and validation evidence.",
    Security: "Review predictions, confidence, and mitigation decisions.",
    "Network Performance": "Compare measured latency, throughput, loss, and utilization.",
    Recovery: "Verify failure detection, alternate routes, and self-healing.",
    About: "Architecture, technology stack, and project context."
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><b>CORNERSTONE</b><small>SELF-HEALING SDN</small></div></div>
      <nav>{pages.map((item) => <button className={page === item.name ? "selected" : ""} key={item.name} onClick={() => setPage(item.name)}><span>{item.icon}</span>{item.name}</button>)}</nav>
      <div className="sidebar-status"><span className="status-dot" /> Controller connected<small>Live telemetry · 5s polling</small></div>
      <button className="refresh" onClick={() => window.location.reload()}>↻ Refresh data</button>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="crumb">CORNERSTONE / {page.toUpperCase()}</p><h1>{page}</h1><p className="description">{pageDescription[page]}</p></div><div className="top-meta"><span className="live"><i /> LIVE</span><span>{data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : "—"}</span><span className="avatar">SDN</span></div></header>
      {error && <div className="alert">{error}</div>}
      {page === "Overview" && <Overview data={data} normal={normal} high={high} sampleCount={sampleCount} averageRecovery={averageRecovery} latestTraffic={latestTraffic} />}
      {page === "Traffic Analytics" && <Traffic data={data} normal={normal} high={high} />}
      {page === "ML Performance" && <ML data={data} />}
      {page === "Security" && <Security data={data} />}
      {page === "Network Performance" && <Network data={data} />}
      {page === "Recovery" && <Recovery data={data} averageRecovery={averageRecovery} />}
      {page === "About" && <About />}
    </main>
  </div>;
}

function Overview({ data, normal, high, sampleCount, averageRecovery, latestTraffic }: { data: DashboardData; normal: number; high: number; sampleCount: number; averageRecovery?: number; latestTraffic?: Row }) {
  return <><section className="kpi-grid"><Card label="Total traffic samples" value={String(data.evaluation?.dataset_samples ?? sampleCount)} detail="Controller observations" /><Card label="Normal traffic" value={String(normal)} detail={`${num(normal / Math.max(normal + high, 1) * 100, 1)}% of samples`} tone="good" /><Card label="High-risk samples" value={String(high)} detail="Classification label" tone="warn" /><Card label="Security events" value={String(data.security.length)} detail="Recent controller actions" /><Card label="Link failures" value={String(data.failures.filter((row) => row.status === "down").length)} detail={`${data.failures.length} port events`} tone="warn" /><Card label="Avg recovery" value={averageRecovery === undefined ? "—" : `${num(averageRecovery)} ms`} detail={`${data.recovery.length} measured runs`} tone="good" /></section><section className="dashboard-grid"><Panel title="Traffic activity over time" eyebrow="LIVE TELEMETRY" wide><Bars rows={data.traffic} field="traffic_rate" /><div className="chart-foot"><span>Traffic rate · bytes/sec</span><b>{latestTraffic ? `${num(latestTraffic.traffic_rate)} B/s latest` : "No samples"}</b></div></Panel><Panel title="Classification distribution" eyebrow="DATASET"><div className="donut" style={{ "--normal": `${normal / Math.max(normal + high, 1) * 100}%` } as React.CSSProperties}><strong>{num(normal / Math.max(normal + high, 1) * 100, 0)}%</strong></div><div className="legend"><span><i className="dot blue" />Normal <b>{normal}</b></span><span><i className="dot orange" />High-risk <b>{high}</b></span></div></Panel><Panel title="Security activity" eyebrow="DECISIONS"><Bars rows={data.security.map((row) => ({ action: row.action, value: "1" }))} field="value" color="orange" /><div className="chart-foot"><span>Recorded actions</span><b>{data.security.length}</b></div></Panel><Panel title="Latest link events" eyebrow="NETWORK HEALTH">{data.failures.length ? <EventList rows={data.failures.slice(0, 5)} /> : <Empty>No failure events recorded.</Empty>}</Panel></section></>;
}

function Panel({ title, eyebrow, children, wide = false }: { title: string; eyebrow: string; children: React.ReactNode; wide?: boolean }) { return <article className={`panel ${wide ? "wide" : ""}`}><div className="panel-title"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>{children}</article>; }
function EventList({ rows }: { rows: Row[] }) { return <ul className="event-list">{rows.map((row, i) => <li key={`${row.timestamp}-${i}`}><i className={`event-dot ${cls(row.status)}`} /><div><b>s{row.switch_id} / port {row.port}</b><small>{row.status} · {row.reason}</small></div></li>)}</ul>; }
function Traffic({ data, normal, high }: { data: DashboardData; normal: number; high: number }) { const values = data.traffic.map((row) => Number(row.traffic_rate)).filter(Number.isFinite); return <><section className="kpi-grid"><Card label="Total packets" value={num(data.traffic.reduce((a, r) => a + Number(r.packet_count || 0), 0), 0)} detail="Across collected samples" /><Card label="Total bytes" value={num(data.traffic.reduce((a, r) => a + Number(r.byte_count || 0), 0), 0)} detail="Flow byte counters" /><Card label="Average rate" value={`${num(values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1))} B/s`} detail="Mean traffic rate" /><Card label="Maximum rate" value={`${num(Math.max(...values, 0))} B/s`} detail="Observed peak" tone="warn" /><Card label="Normal / high" value={`${normal} / ${high}`} detail="Class distribution" /></section><section className="dashboard-grid"><Panel title="Traffic rate vs time" eyebrow="INTERACTIVE TREND" wide><Bars rows={data.traffic} field="traffic_rate" /><div className="chart-foot"><span>Normal and high observations</span><b>{data.traffic.length} points</b></div></Panel><Panel title="Traffic rate distribution" eyebrow="DISTRIBUTION"><Bars rows={data.traffic} field="traffic_rate" color="cyan" /><div className="chart-foot"><span>Packet count / byte count available from raw CSV</span></div></Panel><Panel title="Traffic by switch" eyebrow="TOPOLOGY CONTEXT">{[1, 2, 3, 4].map((switchId) => <div className="switch-row" key={switchId}><span>s{switchId}</span><div className="progress"><i style={{ width: `${Math.min(100, data.traffic.filter((r) => r.switch_id === String(switchId)).length / Math.max(data.traffic.length, 1) * 100 * 4)}%` }} /></div><b>{data.traffic.filter((r) => r.switch_id === String(switchId)).length}</b></div>)}</Panel></section></>; }
function ML({ data }: { data: DashboardData }) { return <><section className="kpi-grid"><Card label="Accuracy" value={pct(data.evaluation?.model_metrics?.accuracy)} detail="Selected model" tone="good" /><Card label="Precision" value={pct(data.evaluation?.model_metrics?.precision_high)} detail="High-risk class" /><Card label="Recall" value={pct(data.evaluation?.model_metrics?.recall_high)} detail="High-risk class" /><Card label="F1 score" value={pct(data.evaluation?.model_metrics?.f1_high)} detail="High-risk class" tone="good" /></section><section className="dashboard-grid"><Panel title="Model comparison" eyebrow="BENCHMARK" wide>{data.mlMetrics.map((row) => <div className="model-row" key={row.model}><div><b>{row.model}</b><span>Accuracy {pct(Number(row.accuracy))} · Precision {pct(Number(row.precision))} · Recall {pct(Number(row.recall))}</span></div><div className="progress"><i className={`metric-fill ${row.model.toLowerCase().replaceAll(" ", "-")}`} style={{ width: `${Number(row.f1) * 100}%` }} /></div><strong>{pct(Number(row.f1))}</strong></div>)}</Panel><Panel title="Confusion matrix" eyebrow="CLASSIFICATION EVIDENCE"><PlotImage title="Normal vs high-risk predictions" file="confusion_matrix.png" /></Panel><Panel title="Evaluation evidence" eyebrow="DATASET"><div className="evidence"><b>{data.evaluation?.dataset_samples ?? "—"}</b><span>stratified test samples</span></div><div className="evidence"><b>{data.evaluation?.class_distribution?.normal ?? "—"}</b><span>normal class samples</span></div><div className="evidence"><b>{data.evaluation?.class_distribution?.high ?? "—"}</b><span>high-risk samples</span></div></Panel></section></>; }
function Security({ data }: { data: DashboardData }) { const counts = data.security.reduce<Record<string, number>>((acc, row) => { acc[row.action] = (acc[row.action] || 0) + 1; return acc; }, {}); return <><section className="kpi-grid"><Card label="Total events" value={String(data.security.length)} detail="Controller decisions" /><Card label="Allow" value={String(counts.allow || 0)} detail="Normal traffic" tone="good" /><Card label="Monitor" value={String(counts.monitor || 0)} detail="Needs observation" tone="warn" /><Card label="Mitigations" value={String((counts.mitigate || 0) + (counts.would_mitigate || 0))} detail="Confirmed or dry-run" /></section><Panel title="Recent security decisions" eyebrow="LIVE EVENT STREAM" wide>{data.security.length ? <div className="table-wrap"><table><thead><tr><th>Switch</th><th>Prediction</th><th>Confidence</th><th>Rate</th><th>Action</th><th>Reason</th></tr></thead><tbody>{data.security.map((row, i) => <tr key={`${row.timestamp}-${i}`}><td>s{row.switch_id}</td><td className={cls(row.prediction)}>{row.prediction}</td><td>{num(Number(row.confidence) * 100, 1)}%</td><td>{num(row.traffic_rate)} B/s</td><td><span className={`badge ${cls(row.action)}`}>{titleCase(row.action)}</span></td><td>{row.reason || row.reasons || "—"}</td></tr>)}</tbody></table></div> : <Empty>No security events recorded.</Empty>}</Panel></>; }
function Network({ data }: { data: DashboardData }) { const throughput = data.network.map((r) => Number(r.throughput_mbps)).filter(Number.isFinite); const latency = data.network.map((r) => Number(r.latency_ms)).filter(Number.isFinite); return <><section className="kpi-grid"><Card label="Average latency" value={`${num(latency.reduce((a, b) => a + b, 0) / Math.max(latency.length, 1))} ms`} detail="Measured scenarios" /><Card label="Maximum latency" value={`${num(Math.max(...latency, 0))} ms`} detail="Observed maximum" tone="warn" /><Card label="Average throughput" value={`${num(throughput.reduce((a, b) => a + b, 0) / Math.max(throughput.length, 1))} Mbps`} detail="Measured, not configured" /><Card label="Packet loss" value={data.network.length ? `${num(data.network.reduce((a, r) => a + Number(r.packet_loss_pct || 0), 0) / data.network.length)}%` : "—"} detail="Recorded scenarios" /><Card label="Bandwidth utilization" value={data.network.length ? `${num(data.network.reduce((a, r) => a + Number(r.throughput_mbps || 0) / Math.max(Number(r.configured_bandwidth_mbps), 1) * 100, 0) / data.network.length)}%` : "—"} detail="Measured / configured" /></section><section className="plot-grid"><PlotImage title="Latency comparison" file="latency_comparison.png" /><PlotImage title="Throughput comparison" file="throughput_comparison.png" /><PlotImage title="Packet loss comparison" file="packet_loss_comparison.png" /><PlotImage title="Bandwidth utilization" file="bandwidth_utilization.png" /></section><Panel title="Network performance summary" eyebrow="EXPERIMENT RESULTS" wide>{data.network.length ? <div className="table-wrap"><table><thead><tr><th>Scenario</th><th>Latency</th><th>Throughput</th><th>Packet loss</th><th>Configured bandwidth</th></tr></thead><tbody>{data.network.map((row) => <tr key={row.scenario}><td>{row.scenario}</td><td>{row.latency_ms} ms</td><td>{row.throughput_mbps} Mbps</td><td>{row.packet_loss_pct}%</td><td>{row.configured_bandwidth_mbps} Mbps</td></tr>)}</tbody></table></div> : <Empty>No network experiment measurements available.</Empty>}</Panel></>; }
function PlotImage({ title, file }: { title: string; file: string }) { return <article className="plot-card"><div className="plot-card-title"><p className="eyebrow">RESULTS / PLOTS</p><h3>{title}</h3></div><img src={`/api/plots/${file}`} alt={title} /><small>Hover chart bars or rows for exact values</small></article>; }
function Recovery({ data, averageRecovery }: { data: DashboardData; averageRecovery?: number }) { const down = data.failures.filter((row) => row.status === "down").length; const up = data.failures.filter((row) => row.status === "up").length; const rows = data.recovery.map((row) => { const routeCalculated = Boolean(row.alternate_path); const expectedRules = row.alternate_path ? row.alternate_path.split("->").length * 2 : 0; const rulesInstalled = Number(row.final_flow_rules) >= expectedRules && expectedRules > 0; const verified = data.verification.find((item) => item.source_recovery_timestamp === row.timestamp)?.connectivity_verified === "true"; const verification = data.verification.find((item) => item.source_recovery_timestamp === row.timestamp); return { timestamp: row.timestamp, failed_link: row.failed_link, alternate_path: row.alternate_path, final_flow_rules: row.final_flow_rules, routeCalculated, rulesInstalled, verified, verifiedTime: verification?.recovery_time_ms }; }); const verifiedTimes = data.verification.map((row) => Number(row.recovery_time_ms)).filter(Number.isFinite); const measuredAverage = verifiedTimes.length ? verifiedTimes.reduce((a, b) => a + b, 0) / verifiedTimes.length : averageRecovery; return <><section className="kpi-grid"><Card label="Failure events" value={String(down)} detail="Confirmed link-down events" tone="warn" /><Card label="Routes calculated" value={String(rows.filter((r) => r.routeCalculated).length)} detail="Alternate paths recorded" /><Card label="Rules installed" value={String(rows.filter((r) => r.rulesInstalled).length)} detail="Expected rules present" /><Card label="Connectivity verified" value={String(rows.filter((r) => r.verified).length)} detail="Successful end-to-end checks" tone={rows.some((r) => r.verified) ? "good" : ""} /><Card label="Recovery time" value={measuredAverage === undefined || !verifiedTimes.length ? "—" : `${num(measuredAverage)} ms`} detail="Failure detection → ping success" /></section><section className="dashboard-grid"><Panel title="Redundant topology" eyebrow="PATH MANAGER" wide><div className="topology"><div className="host">h1</div><div className="node primary">s1</div><span className="topology-link failed">×</span><div className="node primary failed-node">s2</div><div className="node backup">s3</div><span className="topology-link active">→</span><div className="node primary">s4</div><div className="host">h4</div><div className="backup-line">active backup: s1 ───── s3 ───── s4</div></div><div className="legend"><span><i className="dot blue" />Primary route</span><span><i className="dot cyan" />Active backup route</span><span><i className="dot red" />Failed link</span></div></Panel><Panel title="Recovery event history" eyebrow="VERIFICATION">{rows.length ? <div className="table-wrap"><table><thead><tr><th>Failed link</th><th>Route calculated</th><th>Rules installed</th><th>Connectivity</th><th>Recovery time</th></tr></thead><tbody>{rows.map((row, i) => <tr key={`${i}-${row.failed_link}`}><td className="failed-link">{row.failed_link}</td><td><span className={`badge ${row.routeCalculated ? "cyan-status" : "muted"}`}>{row.routeCalculated ? row.alternate_path : "No route"}</span></td><td><span className={`badge ${row.rulesInstalled ? "cyan-status" : "warn"}`}>{row.rulesInstalled ? `${row.final_flow_rules} rules` : `${row.final_flow_rules || 0} / expected`}</span></td><td><span className={`badge ${row.verified ? "good" : "muted"}`}>{row.verified ? "Verified" : "Not verified"}</span></td><td>{row.verifiedTime ? `${num(row.verifiedTime)} ms` : "—"}</td></tr>)}</tbody></table></div> : <Empty>No recovery measurements yet.</Empty>}</Panel><Panel title="Recovery timeline" eyebrow="END-TO-END STATUS"><ol className="timeline"><li className="done">Link failure detected</li><li className={rows.some((r) => r.routeCalculated) ? "done" : ""}>Route calculated</li><li className={rows.some((r) => r.rulesInstalled) ? "done" : ""}>Rules installed</li><li className={rows.some((r) => r.verified) ? "done" : ""}>Connectivity verified</li></ol><p className="verification-note">Green success appears only after an explicit successful Mininet connectivity verification.</p></Panel></section></>; }
function About() { return <section className="about"><div className="about-hero"><p className="eyebrow">PROJECT OVERVIEW</p><h2>AI-Powered Self-Healing<br />Software-Defined Networking</h2><p>Cornerstone combines OpenFlow telemetry, explainable ML classification, controlled mitigation, and topology-aware recovery into one demonstrable platform.</p></div><Panel title="Architecture" eyebrow="END-TO-END FLOW" wide><div className="architecture">{["Mininet hosts", "Open vSwitch", "OpenFlow 1.3", "OS-Ken controller", "Flow statistics", "ML classification", "Decision engine", "Path manager", "Route installation", "Network recovery"].map((item, i) => <div key={item}><span>{item}</span>{i < 9 && <b>↓</b>}</div>)}</div></Panel><Panel title="Technology stack" eyebrow="FOUNDATION"><div className="stack">{["Python", "Mininet", "Open vSwitch", "OS-Ken 4.2.1", "OpenFlow 1.3", "Scikit-learn", "Pandas", "Plotly / Next.js"].map((item) => <span key={item}>{item}</span>)}</div></Panel></section>; }
