import Dashboard from "./Dashboard";
import { getGoogleUser } from "./auth";
import { PublicHome } from "./PublicHome";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const user = await getGoogleUser();
  if (!user) {
    const { auth_error: authError } = await searchParams;
    return <PublicHome error={authError === "1"} />;
  }
  return <Dashboard user={{ name: user.name, email: user.email }} />;
}
