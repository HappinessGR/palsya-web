"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { proceedFromStage } from "../actions";
import { Icon } from "../../components/Icon";

export function ProceedFromStageForm({
  assessmentResponseId,
  label,
  override = false,
  showArrow = false,
}: {
  assessmentResponseId: string;
  label: string;
  override?: boolean;
  showArrow?: boolean;
}) {
  const t = useTranslations("onboarding.phase");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (override) {
      const confirmed = window.confirm(t("confirmText"));
      if (!confirmed) return;
    }
    startTransition(() => {
      proceedFromStage(assessmentResponseId, override);
    });
  }

  return (
    <button type="button" className={override ? "btn btn-quiet" : "btn btn-lg"} onClick={handleClick} disabled={isPending}>
      {label}
      {showArrow && <Icon name="arrow-right" size={18} />}
    </button>
  );
}
