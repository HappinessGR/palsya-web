/**
 * Camera capture and image-quality checks, ported from the legacy
 * prototype's assets/js/scanner.js (SC.steps, SC.start, SC.grab, SC.quality).
 *
 * Only the real parts are ported. The prototype's symmetry score and
 * landmarks (SC.simulate / SC.interpret) were simulated and are deliberately
 * left out — nothing here produces a score.
 */

export type StepId = "position" | "rest" | "brow" | "smile" | "eyes";

/** Countdown seconds per step; text lives in appScan.scan.steps.<id>. */
export const STEPS: { id: StepId; hold: number }[] = [
  { id: "position", hold: 0 },
  { id: "rest", hold: 3 },
  { id: "brow", hold: 3 },
  { id: "smile", hold: 3 },
  { id: "eyes", hold: 3 },
];

export type IssueKey = "dark" | "bright" | "uneven" | "blur" | "flat" | "motion";
export type Grade = "good" | "fair" | "poor";

export interface Quality {
  grade: Grade;
  issues: IssueKey[];
  raw: Uint8ClampedArray;
  metrics: { mean: number; sd: number; sharp: number; evenness: number; motion: number | null };
}

export type BlockReason = "noApi" | "insecure";
export type StartError = "denied" | "notFound" | "generic";

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function blockReason(): BlockReason | null {
  if (!navigator.mediaDevices?.getUserMedia) return "noApi";
  if (!window.isSecureContext) return "insecure";
  return null;
}

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
    });
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    return stream;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    const reason: StartError = name === "NotAllowedError" ? "denied" : name === "NotFoundError" ? "notFound" : "generic";
    throw new Error(reason);
  }
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export interface Frame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export function grab(video: HTMLVideoElement, width = 300): Frame {
  const vw = video.videoWidth || 480;
  const vh = video.videoHeight || 640;
  const w = width;
  const h = Math.round((w * vh) / vw);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

/** Real image-quality checks: brightness, side lighting, sharpness, contrast, motion. */
export function quality(frame: Frame, prev: Uint8ClampedArray | null): Quality {
  const px = frame.ctx.getImageData(0, 0, frame.w, frame.h).data;
  const n = frame.w * frame.h;
  const mid = frame.w >> 1;
  const lum = new Float32Array(n);
  let sum = 0, sumSq = 0, lSum = 0, rSum = 0, lN = 0, rN = 0;

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const y = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
    lum[i] = y;
    sum += y;
    sumSq += y * y;
    if (i % frame.w < mid) { lSum += y; lN++; } else { rSum += y; rN++; }
  }
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sumSq / n - mean * mean));

  // Sharpness: mean |laplacian| on a sampled grid.
  let lap = 0, lapN = 0;
  for (let yy = 2; yy < frame.h - 2; yy += 2) {
    for (let xx = 2; xx < frame.w - 2; xx += 2) {
      const k = yy * frame.w + xx;
      lap += Math.abs(4 * lum[k] - lum[k - 1] - lum[k + 1] - lum[k - frame.w] - lum[k + frame.w]);
      lapN++;
    }
  }
  const sharp = lapN ? lap / lapN : 0;

  // Motion against the previous frame.
  let motion: number | null = null;
  if (prev && prev.length === px.length) {
    let diff = 0;
    for (let q = 0; q < px.length; q += 40) diff += Math.abs(px[q] - prev[q]);
    motion = diff / (px.length / 40);
  }

  const evenness = Math.abs(lSum / (lN || 1) - rSum / (rN || 1));

  const issues: IssueKey[] = [];
  if (mean < 52) issues.push("dark");
  else if (mean > 208) issues.push("bright");
  if (evenness > 26) issues.push("uneven");
  if (sharp < 3.2) issues.push("blur");
  if (sd < 26) issues.push("flat");
  if (motion != null && motion > 16) issues.push("motion");

  const grade: Grade =
    issues.length === 0 ? "good" : issues.some((k) => k === "dark" || k === "uneven" || k === "blur") ? "poor" : "fair";

  return {
    grade,
    issues,
    raw: px,
    metrics: {
      mean: round(mean, 1),
      sd: round(sd, 1),
      sharp: round(sharp, 2),
      evenness: round(evenness, 1),
      motion: motion == null ? null : round(motion, 1),
    },
  };
}

export function toDataUrl(frame: Frame, width = 240): string | null {
  const w = width;
  const h = Math.round((w * frame.h) / frame.w);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(frame.canvas, 0, 0, w, h);
  try {
    return c.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}
