"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Icon } from "../../components/Icon";
import {
  STEPS,
  blockReason,
  grab,
  quality as checkQuality,
  startCamera,
  stopCamera,
  toDataUrl,
  type BlockReason,
  type Grade,
  type Quality,
  type StartError,
} from "./scanner";

type Captured = { step: (typeof STEPS)[number]["id"]; image: string | null; grade: Grade };

/**
 * The guided face capture, ported from the legacy prototype's
 * scanCapture()/mountCapture() in assets/js/views-app.js. Camera, step
 * guidance, countdowns and quality checks are real. Frames stay in this
 * component's memory for review and are gone when the page is left —
 * there is no scan storage or measurement yet, so no score is shown.
 */
export function ScanCapture({ mirror }: { mirror: boolean }) {
  const t = useTranslations("appScan.scan");
  const format = useFormatter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevRef = useRef<Uint8ClampedArray | null>(null);
  const qualityRef = useRef<Quality | null>(null);

  const [attempt, setAttempt] = useState(0);
  const [blocked, setBlocked] = useState<BlockReason | StartError | null>(null);
  const [live, setLive] = useState(false);
  const [q, setQ] = useState<Quality | null>(null);
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [frames, setFrames] = useState<Captured[]>([]);
  const [confirmPoor, setConfirmPoor] = useState(false);
  const [done, setDone] = useState(false);

  // Start the camera (again on "Try again" / "Retake") and watch quality every 900ms.
  useEffect(() => {
    if (done) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let monitor: ReturnType<typeof setInterval> | null = null;

    const reason = blockReason();
    if (reason) {
      queueMicrotask(() => !cancelled && setBlocked(reason));
      return () => { cancelled = true; };
    }

    startCamera(video)
      .then((stream) => {
        if (cancelled) return stopCamera(stream);
        streamRef.current = stream;
        setBlocked(null);
        setLive(true);
        monitor = setInterval(() => {
          try {
            const result = checkQuality(grab(video, 200), prevRef.current);
            prevRef.current = result.raw;
            qualityRef.current = result;
            setQ(result);
          } catch {
            /* video not ready yet */
          }
        }, 900);
      })
      .catch((err: Error) => {
        if (!cancelled) setBlocked(err.message as StartError);
      });

    return () => {
      cancelled = true;
      if (monitor) clearInterval(monitor);
      stopCamera(streamRef.current);
      streamRef.current = null;
      setLive(false);
    };
  }, [attempt, done]);

  // Countdown → capture.
  useEffect(() => {
    if (count <= 0) return;
    const timer = setTimeout(() => {
      if (count > 1) return setCount(count - 1);
      setCount(0);
      const video = videoRef.current;
      let image: string | null = null;
      if (video?.videoWidth) {
        try {
          image = toDataUrl(grab(video, 300));
        } catch {
          /* frame not available */
        }
      }
      setFrames((f) => [...f, { step: STEPS[step].id, image, grade: qualityRef.current?.grade ?? "good" }]);
      if (step < STEPS.length - 1) setStep(step + 1);
      else setDone(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [count, step]);

  const startCountdown = () => setCount(STEPS[step].hold || 3);

  const onCapture = () => {
    if (q?.grade === "poor") return setConfirmPoor(true);
    startCountdown();
  };

  const restart = () => {
    setCount(0);
    setStep(0);
    setFrames([]);
    setDone(false);
  };

  if (done) {
    return (
      <div style={{ maxWidth: 880, marginInline: "auto" }}>
        <div className="center">
          <span className="badge badge-brand">
            <Icon name="check" size={13} />
            {t("review.complete", { date: format.dateTime(new Date(), { dateStyle: "medium" }) })}
          </span>
          <h2 className="display" style={{ fontSize: "var(--t-2xl)", marginTop: 14 }}>
            {t("review.title")}
          </h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {t("review.sub")}
          </p>
        </div>

        <div className="note note-warn" style={{ marginTop: "var(--s-5)" }}>
          <Icon name="info" size={19} className="note-icon" />
          <div>
            <b>{t("review.notAvailableTitle")}</b> {t("review.notAvailableBody")}
          </div>
        </div>

        <div className="grid" style={{ marginTop: "var(--s-5)", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "var(--s-4)" }}>
          {frames.map((f) => (
            <div className="card card-pad-sm" key={f.step}>
              <div className="tl-thumb" style={{ width: "100%" }}>
                {f.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- in-memory data URL, never uploaded
                  <img
                    src={f.image}
                    alt={t(`steps.${f.step}.title`)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", transform: mirror ? "scaleX(-1)" : undefined }}
                  />
                ) : (
                  <div className="center small muted" style={{ paddingTop: "40%" }}>
                    <Icon name="image" size={22} />
                  </div>
                )}
              </div>
              <div className="tl-when" style={{ marginTop: 8 }}>
                {t(`steps.${f.step}.title`)}
              </div>
              <div className="tl-sub">
                <span className={f.grade === "good" ? "badge badge-ok" : "badge badge-warn"} style={{ padding: "1px 7px", fontSize: 10 }}>
                  {t("review.frameQuality", { quality: t(`quality.${f.grade}`) })}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="row-wrap" style={{ marginTop: "var(--s-6)", justifyContent: "center" }}>
          <Link className="btn btn-lg" href="/dashboard">
            {t("review.backToToday")}
          </Link>
          <button type="button" className="btn btn-quiet" onClick={restart}>
            <Icon name="rotate-ccw" size={16} />
            {t("review.retake")}
          </button>
        </div>
      </div>
    );
  }

  const current = STEPS[step];
  const badge = !live
    ? { cls: blocked ? "scan-badge amber" : "scan-badge", icon: "info", text: blocked ? t("cameraOff") : t("gettingReady") }
    : !q
      ? { cls: "scan-badge", icon: "info", text: t("gettingReady") }
      : {
          cls: `scan-badge ${q.grade === "good" ? "green" : q.grade === "fair" ? "amber" : "red"}`,
          icon: q.grade === "good" ? "check" : "alert",
          text: q.grade === "good" ? t("qualityGood") : t(`issues.${q.issues[0]}.t`),
        };

  return (
    <div style={{ maxWidth: 820, marginInline: "auto" }}>
      <div className="row-between" style={{ marginBottom: "var(--s-5)", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-2xl)" }}>
            {t("title")}
          </h2>
          <p className="small muted" style={{ marginTop: 4 }}>
            {t("shortSteps", { n: STEPS.length })}
          </p>
        </div>
        <Link className="btn btn-sm btn-quiet" href="/dashboard">
          <Icon name="x" size={16} />
          {t("leave")}
        </Link>
      </div>

      <div className="steps" style={{ marginBottom: "var(--s-5)" }}>
        {STEPS.map((s, i) => (
          <i key={s.id} className={i < step ? "done" : i === step ? "now" : ""} />
        ))}
      </div>

      {blocked && (
        <div className="note note-warn">
          <Icon name="camera" size={19} className="note-icon" />
          <div>
            <b>{t("cameraUnavailableTitle")}</b> {t(`errors.${blocked}`)}
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
                <Icon name="rotate-ccw" size={15} />
                {t("tryAgain")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid g2" style={{ marginTop: "var(--s-5)", alignItems: "start", gap: "var(--s-6)" }}>
        <div className="scan-stage">
          <video ref={videoRef} playsInline muted className={mirror ? "mirror" : undefined} />
          {!live && blocked && (
            <div className="center" style={{ color: "#9fb3af", padding: 24, position: "relative" }}>
              <Icon name="camera" size={34} />
              <p className="small" style={{ marginTop: 10 }}>
                {t("cameraOff")}
              </p>
            </div>
          )}
          <OvalOverlay />
          <div className={badge.cls}>
            <Icon name={badge.icon} size={14} />
            {badge.text}
          </div>
          {count > 0 && <div className="scan-count">{count}</div>}
          <div className="scan-hud">
            <div className="sh-msg">{t(`steps.${current.id}.msg`)}</div>
            <div className="sh-sub">{t(`steps.${current.id}.sub`)}</div>
          </div>
        </div>

        <div>
          <div className="card card-pad-lg">
            <div className="small muted">{t("stepOf", { n: step + 1, of: STEPS.length })}</div>
            <h3 className="h-card" style={{ marginTop: 4 }}>
              {t(`steps.${current.id}.title`)}
            </h3>
            <p className="mt-4">{t(`steps.${current.id}.sub`)}</p>

            <div style={{ marginTop: 16 }}>
              {live && q && q.issues.length > 0 &&
                q.issues.map((k) => (
                  <div className="note note-warn" style={{ marginBottom: 8 }} key={k}>
                    <Icon name="alert" size={18} className="note-icon" />
                    <div>
                      <b>{t(`issues.${k}.t`)}</b>
                      <div className="small" style={{ marginTop: 2 }}>
                        {t(`issues.${k}.fix`)}
                      </div>
                    </div>
                  </div>
                ))}
              {live && q && q.issues.length === 0 && (
                <div className="note note-ok">
                  <Icon name="check-circle" size={18} className="note-icon" />
                  <div>{t("qualityAllGood", { mean: q.metrics.mean, evenness: q.metrics.evenness })}</div>
                </div>
              )}
            </div>

            <div className="row-wrap" style={{ marginTop: "var(--s-5)" }}>
              <button type="button" className="btn btn-lg" onClick={onCapture} disabled={!live || count > 0}>
                <Icon name={step === 0 ? "camera" : "check"} size={18} />
                {step === 0 ? t("startCapture") : t("captureThisOne")}
              </button>
              {step > 0 && (
                <button type="button" className="btn btn-quiet" onClick={restart}>
                  <Icon name="rotate-ccw" size={16} />
                  {t("startOver")}
                </button>
              )}
            </div>
          </div>

          <div className="card card-pad-lg card-tint" style={{ marginTop: "var(--s-4)" }}>
            <h4 style={{ fontSize: "var(--t-sm)", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>
              {t("worthComparing")}
            </h4>
            <ul style={{ marginTop: 10, paddingLeft: "1.1em" }}>
              {(["tip1", "tip2", "tip3", "tip4"] as const).map((k) => (
                <li className="small" key={k}>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>

          <div className="note note-warn" style={{ marginTop: "var(--s-5)" }}>
            <Icon name="info" size={19} className="note-icon" />
            <div>
              <b>{t("review.notAvailableTitle")}</b> {t("captureNote")}
            </div>
          </div>
        </div>
      </div>

      {confirmPoor && (
        <div className="modal-bd" onClick={(e) => e.target === e.currentTarget && setConfirmPoor(false)}>
          <div className="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="poor-title">
            <div className="modal-hd">
              <h3 id="poor-title">{t("poorQualityTitle")}</h3>
              <button type="button" className="btn-icon btn-quiet" aria-label={t("close")} onClick={() => setConfirmPoor(false)}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="modal-bd-inner">
              <p>{t("poorQualityBody")}</p>
            </div>
            <div className="modal-ft">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmPoor(false)} autoFocus>
                {t("letMeFixIt")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setConfirmPoor(false);
                  startCountdown();
                }}
              >
                {t("captureAnyway")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OvalOverlay() {
  return (
    <svg className="scan-oval" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <mask id="om">
          <rect width="300" height="400" fill="#fff" />
          <ellipse cx="150" cy="185" rx="98" ry="132" fill="#000" />
        </mask>
      </defs>
      <rect width="300" height="400" fill="rgba(14,27,25,.5)" mask="url(#om)" />
      <ellipse cx="150" cy="185" rx="98" ry="132" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeDasharray="9 7" />
      <line x1="150" y1="60" x2="150" y2="310" stroke="rgba(255,255,255,.35)" strokeWidth="1" strokeDasharray="4 6" />
      <line x1="70" y1="185" x2="230" y2="185" stroke="rgba(255,255,255,.25)" strokeWidth="1" strokeDasharray="4 6" />
    </svg>
  );
}
