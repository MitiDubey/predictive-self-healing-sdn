import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const root = path.resolve(process.cwd(), "..");

type Row = Record<string, string>;

async function readCsv(file: string): Promise<Row[]> {
  try {
    const text = await readFile(path.join(root, file), "utf8");
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [
        header,
        values[index] ?? ""
      ]));
    });
  } catch {
    return [];
  }
}

async function readJson(file: string) {
  try {
    return JSON.parse(await readFile(path.join(root, file), "utf8"));
  } catch {
    return null;
  }
}

export async function GET() {
  const [recovery, verification, failures, security, traffic, mlMetrics, network, evaluation] =
    await Promise.all([
      readCsv("logs/recovery_events.csv"),
      readCsv("logs/recovery_verification.csv"),
      readCsv("logs/failure_events.csv"),
      readCsv("logs/security_events.csv"),
      readCsv("traffic_data.csv"),
      readCsv("results/ml_metrics.csv"),
      readCsv("results/network_results.csv"),
      readJson("results/final_evaluation.json")
    ]);

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    recovery,
    verification,
    failures: failures.slice(-20).reverse(),
    security: security.slice(-20).reverse(),
    traffic: traffic.slice(-30),
    mlMetrics,
    network,
    evaluation
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
