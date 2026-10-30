import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const allowedPlots = new Set([
  "latency_comparison.png",
  "throughput_comparison.png",
  "packet_loss_comparison.png",
  "bandwidth_utilization.png",
  "confusion_matrix.png",
]);

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
      path.resolve(process.cwd(), "..", "results", "plots", filename),
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
