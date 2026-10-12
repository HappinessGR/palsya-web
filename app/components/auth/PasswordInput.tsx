"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon";

interface PasswordInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: "new-password" | "current-password";
  /** Ids of hint/error elements that describe this input. */
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
}

/** Password field with a show/hide toggle. */
export function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete = "new-password",
  describedBy,
  invalid,
  required = true,
}: PasswordInputProps) {
  const t = useTranslations("passwordReset.input");
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="input"
          style={{ paddingRight: 48 }}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hide") : t("show")}
          aria-pressed={visible}
          aria-controls={id}
          style={{
            position: "absolute",
            top: "50%",
            right: 6,
            transform: "translateY(-50%)",
            display: "grid",
            placeItems: "center",
            width: 36,
            height: 36,
            padding: 0,
            border: 0,
            borderRadius: "var(--r-full)",
            background: "transparent",
            color: "var(--ink-3)",
            cursor: "pointer",
          }}
        >
          <Icon name={visible ? "eye-off" : "eye"} size={20} />
        </button>
      </div>
    </div>
  );
}
