import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "../../src/db";
import { daysBetween, today } from "../../src/lib/assessment";

export interface ShellData {
  name: string;
  stageNum: number;
  /** Programme day, counted from the day the subscription (trial) started — legacy P.store.programDay(). */
  programDay: number;
  plan: "trial" | "subscriber";
}

/**
 * What the sidebar's Stage card and account block need. Cached per request so
 * the layout and the page can both call it without a second round trip.
 */
export const getShellData = cache(async (): Promise<ShellData> => {
  const user = await currentUser();
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    "";
  if (!user) return { name, stageNum: 1, programDay: 1, plan: "subscriber" };

  const [row, sub] = await Promise.all([
    db.query.users.findFirst({ where: { clerkUserId: user.id }, with: { patientProfile: true } }),
    db.query.subscriptions.findFirst({ where: { clerkUserId: user.id } }),
  ]);

  const started = sub?.createdAt ?? row?.patientProfile?.createdAt ?? null;
  const programDay = started ? daysBetween(started.toISOString().slice(0, 10), today()) + 1 : 1;

  return {
    name: row?.fullName || name,
    stageNum: row?.patientProfile?.phase ?? 1,
    programDay: Math.max(1, programDay),
    plan: sub?.status === "trialing" ? "trial" : "subscriber",
  };
});
