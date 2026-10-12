import { currentUser } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../i18n/metadata";
import { getDashboardData } from "./data";
import { stage as stageFor } from "../lib/programme";
import { SessionCard } from "./components/SessionCard";
import { PhaseBandCard } from "./components/PhaseBandCard";
import { ScoreCard } from "./components/ScoreCard";
import { ClinicianCard } from "./components/ClinicianCard";
import { LibraryCard } from "./components/LibraryCard";

export function generateMetadata() {
  return pageMetadata("dashboard.meta");
}

function timeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard.home");
  const user = await currentUser();
  const data = user ? await getDashboardData(user.id) : null;
  const stage = stageFor(data?.stageNum ?? 1);
  const tod = timeOfDay();

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div className="greet">
          <h2>
            {user?.firstName ? t(`greeting.named.${tod}`, { name: user.firstName }) : t(`greeting.anonymous.${tod}`)}
          </h2>
          <p>{t("daysInStage", { days: data?.daysInStage ?? 0, stage: stage.n })}</p>
        </div>
      </div>

      <SessionCard stage={stage} todaySession={data?.todaySession ?? null} />

      <div className="grid g2" style={{ marginTop: "var(--s-6)", alignItems: "start" }}>
        <PhaseBandCard stage={stage} daysInStage={data?.daysInStage ?? 0} recentPattern={data?.recentPattern ?? Array(21).fill("none")} />
        <ScoreCard />
      </div>

      <div className="grid g2" style={{ marginTop: "var(--s-6)", alignItems: "start" }}>
        <ClinicianCard />
        <LibraryCard stage={stage.n} />
      </div>
    </div>
  );
}
