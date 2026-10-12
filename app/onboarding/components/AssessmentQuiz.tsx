"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  sections as sectionsOf,
  isAnswered,
  daysBetween,
  today,
  optionKey,
  type Answers,
  type AnswerValue,
  type Question,
} from "../../../src/lib/assessment";
import { saveAssessmentDraft } from "../actions";
import { Icon } from "../../components/Icon";

function QuestionBlock({
  question,
  value,
  error,
  onSingle,
  onMulti,
  onDate,
}: {
  question: Question;
  value: AnswerValue;
  error?: string;
  onSingle: (id: string, v: string) => void;
  onMulti: (id: string, v: string, exclusive?: boolean) => void;
  onDate: (id: string, v: string) => void;
}) {
  const t = useTranslations("assessment");
  const arr = Array.isArray(value) ? value : [];

  return (
    <fieldset style={{ border: 0, padding: 0, margin: "0 0 var(--s-7)" }}>
      <legend className="strong" style={{ fontSize: "var(--t-lg)", marginBottom: 6 }}>
        {t(`questions.${question.id}.q`)}
      </legend>
      {question.help && (
        <p className="small muted" style={{ marginBottom: 14 }}>
          {t(`questions.${question.id}.help`)}
        </p>
      )}

      {question.type === "date" && (
        <input
          className="input input-lg"
          type="date"
          max={today()}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onDate(question.id, e.target.value)}
          style={{ maxWidth: 260 }}
        />
      )}

      {question.type === "single" && (
        <div className="grid" style={{ gap: 10 }}>
          {question.options!.map((o) => (
            <button
              key={o.v}
              type="button"
              className="choice"
              aria-pressed={value === o.v}
              onClick={() => onSingle(question.id, o.v)}
            >
              <span className="choice-mark">
                <Icon name="check" size={13} />
              </span>
              <span>
                <span className="choice-t">{t(`${optionKey(question, o.v)}.t`)}</span>
                {o.d && <span className="choice-d" style={{ display: "block" }}>{t(`${optionKey(question, o.v)}.d`)}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {question.type === "multi" && (
        <div className="grid" style={{ gap: 10 }}>
          {question.options!.map((o) => (
            <button
              key={o.v}
              type="button"
              className="choice"
              aria-pressed={arr.includes(o.v)}
              onClick={() => onMulti(question.id, o.v, o.exclusive)}
            >
              <span className="choice-mark sq">
                <Icon name="check" size={13} />
              </span>
              <span>
                <span className="choice-t">{t(`${optionKey(question, o.v)}.t`)}</span>
                {o.d && <span className="choice-d" style={{ display: "block" }}>{t(`${optionKey(question, o.v)}.d`)}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="err" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
    </fieldset>
  );
}

export function AssessmentQuiz({ initialAnswers, initialId }: { initialAnswers: Record<string, unknown>; initialId: string | null }) {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tA = useTranslations("assessment");
  const [answers, setAnswers] = useState<Answers>(initialAnswers as Answers);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(initialId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const sections = useMemo(() => sectionsOf(answers), [answers]);
  const clampedIndex = Math.min(sectionIndex, sections.length - 1);
  const section = sections[clampedIndex];

  function setSingle(id: string, v: string) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  }

  function setMulti(id: string, v: string, exclusive?: boolean) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const isOn = current.includes(v);
      let next: string[];
      if (isOn) {
        next = current.filter((x) => x !== v);
      } else if (exclusive) {
        next = [v];
      } else {
        const options = sectionsOf(prev).flatMap((s) => s.qs).find((q) => q.id === id)?.options ?? [];
        const exclusiveValues = options.filter((o) => o.exclusive).map((o) => o.v);
        next = [...current.filter((x) => !exclusiveValues.includes(x)), v];
      }
      return { ...prev, [id]: next };
    });
    setErrors((prev) => ({ ...prev, [id]: "" }));
  }

  function setDate(id: string, v: string) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  }

  function handleBack() {
    if (clampedIndex === 0) {
      router.push("/onboarding");
      return;
    }
    setSectionIndex(clampedIndex - 1);
  }

  function handleContinue() {
    const missing = section.qs.filter((q) => q.required && !isAnswered(q, answers));
    if (missing.length) {
      const nextErrors: Record<string, string> = {};
      for (const q of missing) nextErrors[q.id] = t("assessment.errRequired");
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    if (typeof answers.onsetDate === "string" && daysBetween(answers.onsetDate, today()) < 0) {
      setErrors((prev) => ({ ...prev, onsetDate: t("assessment.errFutureDate") }));
      return;
    }

    startTransition(async () => {
      const { id } = await saveAssessmentDraft(answers, savedId);
      setSavedId(id);

      const recomputedSections = sectionsOf(answers);
      if (clampedIndex < recomputedSections.length - 1) {
        setSectionIndex(clampedIndex + 1);
      } else {
        router.push("/onboarding/stage");
      }
    });
  }

  const isLastSection = clampedIndex === sections.length - 1;

  return (
    <div className="wrap-read" style={{ padding: 0 }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <p className="eyebrow">{tA("sections." + section.id)}</p>
        <span className="small muted">{t("assessment.sectionIndicator", { current: clampedIndex + 1, total: sections.length })}</span>
      </div>
      <div className="bar bar-sm" style={{ marginBottom: 32 }}>
        <i style={{ width: `${Math.round((clampedIndex / sections.length) * 100)}%` }} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        {section.qs.map((q) => (
          <QuestionBlock
            key={q.id}
            question={q}
            value={answers[q.id]}
            error={errors[q.id]}
            onSingle={setSingle}
            onMulti={setMulti}
            onDate={setDate}
          />
        ))}

        <div className="row-between" style={{ marginTop: 32, flexWrap: "wrap", gap: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={handleBack} disabled={isPending}>
            <Icon name="arrow-left" size={17} />
            {clampedIndex === 0 ? t("nav.back") : t("assessment.previous")}
          </button>
          <button type="submit" className="btn btn-lg" disabled={isPending}>
            {isLastSection ? t("assessment.seeMyStage") : t("nav.continue")}
            <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
