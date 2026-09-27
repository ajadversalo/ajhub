import { redirect } from "next/navigation";
import { getGoogleUser } from "../auth";
import { PublicCardsEditor } from "../PublicCardsEditor";

export const dynamic = "force-dynamic";

export default async function PublicCardsPage() {
  const user = await getGoogleUser();
  if (!user) redirect("/login");

  return <PublicCardsEditor standalone user={{ email: user.email }} />;
}
