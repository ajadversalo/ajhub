import { redirect } from "next/navigation";
import { getGoogleUser } from "../auth";
import { SiteHeader } from "../SiteHeader";
import { PublicCardsEditor } from "../PublicCardsEditor";

export const dynamic = "force-dynamic";

export default async function PublicCardsPage() {
  const user = await getGoogleUser();
  if (!user) redirect("/login");

  return (
    <main className="public-cards-page">
      <SiteHeader user={{ email: user.email }} />
      <div className="public-cards-page-shell">
        <PublicCardsEditor standalone />
      </div>
    </main>
  );
}
