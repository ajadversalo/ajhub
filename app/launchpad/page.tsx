import { redirect } from "next/navigation";
import { getGoogleUser } from "../auth";
import LaunchpadSettings from "../LaunchpadSettings";

export const dynamic = "force-dynamic";

export default async function LaunchpadPage() {
  const user = await getGoogleUser();
  if (!user) redirect("/login");
  return <LaunchpadSettings user={{ name: user.name, email: user.email }} />;
}
