"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localeNames, type Locale } from "../../../i18n/config";
import { MARKER_RE, decodeMarker, hasMarker, stripMarkers } from "../../../src/lib/site-text-markers";
import type { EditableText } from "../../../src/lib/site-text";
import { Icon } from "../Icon";
import { discardText, enterEditMode, exitEditMode, loadText, publishAll, revertText, saveText, type EditResult } from "./actions";
import "../../../styles/edit-mode.css";

const ATTRS = ["title", "placeholder", "aria-label", "alt"];
const UI = "[data-edit-ui]";

/**
 * Finds the edit markers in the rendered page (see src/lib/site-text-markers.ts),
 * removes them from the visible text, and tags each element with the ids of
 * the messages it shows (data-edit-ids). Text nodes are edited in place, never
 * replaced, so React keeps working on the same nodes.
 */
function tagMarkedText(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (!hasMarker(text.data)) continue;
    const parent = text.parentElement;
    if (!parent || parent.closest(UI)) {
      text.data = stripMarkers(text.data);
      continue;
    }
    const ids = new Set((parent.dataset.editIds ?? "").split(" ").filter(Boolean));
    for (const m of text.data.matchAll(MARKER_RE)) ids.add(String(decodeMarker(m[1])));
    text.data = stripMarkers(text.data);
    parent.dataset.editIds = [...ids].join(" ");
  }
  if (root instanceof Element || root instanceof Document) {
    for (const el of (root as ParentNode).querySelectorAll<HTMLElement>(ATTRS.map((a) => `[${a}]`).join(","))) {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (v && hasMarker(v)) el.setAttribute(a, stripMarkers(v));
      }
    }
  }
  if (hasMarker(document.title)) document.title = stripMarkers(document.title);
}

type Props = { editing: boolean; keys: string[]; draftCount: number };

export function EditMode({ editing, keys, draftCount }: Props) {
  const t = useTranslations("backoffice.editMode");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);
  const [choices, setChoices] = useState<string[] | null>(null);
  const [text, setText] = useState<EditableText | null>(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Tag marked text now and whenever React renders more of the page.
  useEffect(() => {
    if (!editing) return;
    document.body.classList.add("edit-mode");
    tagMarkedText(document.body);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") tagMarkedText(r.target.parentNode ?? r.target);
        else r.addedNodes.forEach((n) => tagMarkedText(n));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      document.body.classList.remove("edit-mode");
    };
  }, [editing, pathname]);

  const show = useCallback(
    (res: EditResult, okText?: string) => {
      if (!res.ok) {
        setMessage({ kind: "error", text: t(`error.${res.error}`) + (res.detail ? ` ${t("errorDetail", { detail: res.detail })}` : "") });
        return false;
      }
      if (res.text) {
        setText(res.text);
        setValue(res.text.draft ?? res.text.published ?? res.text.original);
      }
      setMessage(okText ? { kind: "ok", text: okText } : null);
      return true;
    },
    [t],
  );

  const open = useCallback(
    (key: string) => {
      setPanelOpen(true);
      setChoices(null);
      setMessage(null);
      setText(null);
      startTransition(async () => {
        show(await loadText(key));
      });
    },
    [show],
  );

  // In edit mode a click on tagged text opens the editor instead of following
  // the link or button. Alt-click still uses the page normally.
  useEffect(() => {
    if (!editing) return;
    const onClick = (e: MouseEvent) => {
      if (e.altKey) return;
      const target = e.target as Element | null;
      if (!target || target.closest(UI)) return;
      const el = target.closest<HTMLElement>("[data-edit-ids]");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const found = (el.dataset.editIds ?? "").split(" ").map((id) => keys[Number(id)]).filter(Boolean);
      if (found.length === 1) open(found[0]);
      else if (found.length > 1) {
        setText(null);
        setMessage(null);
        setChoices(found);
        setPanelOpen(true);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [editing, keys, open]);

  const run = (action: () => Promise<EditResult>, okText: string) =>
    startTransition(async () => {
      if (show(await action(), okText)) router.refresh();
    });

  const close = () => {
    setPanelOpen(false);
    setText(null);
    setChoices(null);
    setMessage(null);
  };

  if (pathname.startsWith("/admin") || pathname.startsWith("/clinician")) return null;

  if (!editing) {
    return (
      <button
        type="button"
        data-edit-ui
        className="btn btn-sm edit-fab"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await enterEditMode();
            if (res.ok) router.refresh();
          })
        }
      >
        <Icon name="file" size={15} />
        {t("button")}
      </button>
    );
  }

  const stamp = (d: Date | null) => (d ? new Date(d).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

  return (
    <>
      <div className="edit-bar" data-edit-ui role="region" aria-label={t("bar.title")}>
        <strong>{t("bar.title")}</strong>
        <span className="edit-bar-hint">{t("bar.hint", { language: localeNames[locale] })}</span>
        <span className="badge badge-warn">{t("bar.drafts", { n: draftCount })}</span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={pending || draftCount === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await publishAll();
              if (res.ok) {
                setPanelOpen(false);
                setMessage({ kind: "ok", text: t("result.publishedAll", { count: res.count ?? 0 }) });
                router.refresh();
              } else show(res);
            })
          }
        >
          {t("bar.publishAll")}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await exitEditMode();
              close();
              router.refresh();
            })
          }
        >
          {t("bar.exit")}
        </button>
      </div>

      {message && !panelOpen && (
        <div className={`edit-toast note ${message.kind === "ok" ? "note-ok" : "note-safety"}`} data-edit-ui role="status">
          {message.text}
        </div>
      )}

      {panelOpen && (
        <aside className="edit-panel card card-pad-lg" data-edit-ui aria-label={t("panel.title")}>
          <div className="row-between" style={{ gap: 8 }}>
            <h3 className="h-card">{t("panel.title")}</h3>
            <button type="button" className="btn btn-sm btn-quiet" onClick={close} aria-label={t("panel.close")}>
              <Icon name="x" size={16} />
            </button>
          </div>

          {choices && (
            <>
              <p className="small muted" style={{ marginTop: 8 }}>
                {t("panel.choose")}
              </p>
              <div className="stack-sm" style={{ marginTop: 10 }}>
                {choices.map((key) => (
                  <button key={key} type="button" className="btn btn-sm btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => open(key)}>
                    <code className="small">{key}</code>
                  </button>
                ))}
              </div>
            </>
          )}

          {!choices && !text && pending && <p className="small muted" style={{ marginTop: 12 }}>{t("panel.loading")}</p>}

          {text && (
            <>
              <code className="small muted" style={{ display: "block", marginTop: 6, wordBreak: "break-all" }}>
                {text.key}
              </code>
              <div className="row-wrap" style={{ gap: 6, marginTop: 8 }}>
                <span className="badge badge-outline">{localeNames[text.locale]}</span>
                {text.draft !== null && <span className="badge badge-warn">{t("panel.badge.draft", { when: stamp(text.draftUpdatedAt) })}</span>}
                {text.published !== null && <span className="badge badge-ok">{t("panel.badge.published", { when: stamp(text.publishedAt) })}</span>}
                {text.englishChanged && <span className="badge badge-brand">{t("panel.badge.englishChanged")}</span>}
              </div>
              {text.locale !== "en" && (
                <p className="small muted" style={{ marginTop: 10 }}>
                  <span className="strong">{t("panel.english")}</span> {text.english}
                </p>
              )}
              {(text.published !== null || text.draft !== null) && (
                <p className="small faint" style={{ marginTop: 6 }}>
                  <span className="strong">{t("panel.original")}</span> {text.original}
                </p>
              )}
              <textarea
                className="input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={Math.min(10, Math.max(3, Math.ceil(value.length / 45)))}
                style={{ width: "100%", marginTop: 12, fontFamily: "inherit", resize: "vertical" }}
                aria-label={text.key}
                autoFocus
              />
              <p className="small faint" style={{ marginTop: 6 }}>
                {t("panel.hint")}
              </p>
              {message && (
                <div className={`note ${message.kind === "ok" ? "note-ok" : "note-safety"}`} role="status" style={{ marginTop: 10 }}>
                  <div className="small">{message.text}</div>
                </div>
              )}
              <div className="row-wrap" style={{ gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => run(() => saveText(text.key, value, false), t("result.saved"))}>
                  {t("panel.save")}
                </button>
                <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => saveText(text.key, value, true), t("result.published"))}>
                  {t("panel.publish")}
                </button>
                {text.draft !== null && (
                  <button type="button" className="btn btn-sm btn-quiet" disabled={pending} onClick={() => run(() => discardText(text.key), t("result.discarded"))}>
                    {t("panel.discard")}
                  </button>
                )}
                {(text.published !== null || text.draft !== null) && (
                  <button type="button" className="btn btn-sm btn-quiet" disabled={pending} onClick={() => run(() => revertText(text.key), t("result.reverted"))}>
                    {t("panel.revert")}
                  </button>
                )}
              </div>
            </>
          )}

          {!text && !choices && message && (
            <div className={`note ${message.kind === "ok" ? "note-ok" : "note-safety"}`} role="status" style={{ marginTop: 10 }}>
              <div className="small">{message.text}</div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
