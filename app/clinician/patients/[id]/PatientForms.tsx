"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addNoteAction, changeStageAction, type ClinicianActionState } from "./actions";

const IDLE: ClinicianActionState = { status: "idle" };
const NOTE_MAX = 5000;
const REASON_MAX = 500;
const STAGES = [1, 2, 3, 4, 5] as const;

export function AddNoteForm({ patientProfileId }: { patientProfileId: string }) {
  const t = useTranslations("clinician.patient");
  const [state, formAction, pending] = useActionState(addNoteAction.bind(null, patientProfileId), IDLE);

  return (
    <form action={formAction} className="field" style={{ marginTop: 16 }}>
      <label className="label" htmlFor="note-body">
        {t("notes.label")}
      </label>
      <textarea
        id="note-body"
        name="body"
        className="textarea"
        required
        maxLength={NOTE_MAX}
        placeholder={t("notes.placeholder")}
        aria-describedby="note-hint"
      />
      <p id="note-hint" className="hint">
        {t("notes.hint", { max: NOTE_MAX })}
      </p>
      {state.status === "error" && (
        <p className="err" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      )}
      {state.status === "ok" && (
        <p className="small muted" role="status">
          {t("notes.saved")}
        </p>
      )}
      <div style={{ marginTop: 8 }}>
        <button type="submit" className="btn btn-sm" disabled={pending}>
          {pending ? t("notes.saving") : t("notes.submit")}
        </button>
      </div>
    </form>
  );
}

export function ChangeStageForm({ patientProfileId, current }: { patientProfileId: string; current: number | null }) {
  const t = useTranslations("clinician.patient");
  const tAll = useTranslations();
  const [state, formAction, pending] = useActionState(changeStageAction.bind(null, patientProfileId), IDLE);

  return (
    <form action={formAction} style={{ marginTop: 12 }}>
      <div className="field">
        <label className="label" htmlFor="stage-select">
          {t("stage.label")}
        </label>
        <select id="stage-select" name="stage" className="select" defaultValue={String(current ?? 1)} required>
          {STAGES.map((n) => (
            <option key={n} value={n}>
              {t("stage.option", { stage: n, name: tAll(`programme.stages.${n}.name`) })}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label className="label" htmlFor="stage-reason">
          {t("stage.reasonLabel")}
        </label>
        <input id="stage-reason" name="reason" className="input" maxLength={REASON_MAX} aria-describedby="stage-hint" />
        <p id="stage-hint" className="hint">
          {t("stage.reasonHint", { max: REASON_MAX })}
        </p>
      </div>
      {state.status === "error" && (
        <p className="err" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      )}
      {state.status === "ok" && state.stage && (
        <p className="small muted" role="status">
          {t("stage.saved", { stage: state.stage })}
        </p>
      )}
      <div style={{ marginTop: 8 }}>
        <button type="submit" className="btn btn-sm" disabled={pending}>
          {pending ? t("stage.saving") : t("stage.submit")}
        </button>
      </div>
    </form>
  );
}
