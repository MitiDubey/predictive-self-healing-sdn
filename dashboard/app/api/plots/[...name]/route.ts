import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowedPlots = new Set([
  "latency_comparison.png",
  "throughput_comparison.png",
  "packet_loss_comparison.png",
  "bandwidth_utilization.png",
  "confusion_matrix.png",
  "ml_accuracy_comparison.png",
  "ml_metrics_comparison.png",
  "recovery_time.png",
  "traffic_rate_distribution.png",
  "traffic_rate_over_time.png",
]);

const root =
  process.env.CORNERSTONE_ROOT ||
  (path.basename(process.cwd()) === "dashboard"
    ? path.resolve(process.cwd(), "..")
    : process.cwd());

export async function GET(
  _request: Request,
  { params }: { params: { name: string[] } },
) {
  const filename = params.name.join("/");
  if (!allowedPlots.has(filename)) {
    return new NextResponse("Plot not found", { status: 404 });
  }

  try {
    const image = await readFile(
      path.resolve(root, "results", "plots", filename),
    );
    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Plot not found", { status: 404 });
  }
}
