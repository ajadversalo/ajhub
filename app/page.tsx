import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";
import { getGoogleUser } from "./auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getGoogleUser();
  if (!user) redirect("/login");
  return <Dashboard user={{ name: user.name, email: user.email }} />;
}
