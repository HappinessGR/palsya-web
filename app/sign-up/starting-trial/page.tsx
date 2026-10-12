import { pageMetadata } from "../../../i18n/metadata";
import { StartingTrialClient } from "./StartingTrialClient";

export async function generateMetadata() {
  return pageMetadata("auth.startingTrial.meta");
}

export default function StartingTrialPage() {
  return <StartingTrialClient />;
}
