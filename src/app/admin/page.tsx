import { isAuthed } from "@/lib/auth";
import LoginForm from "./LoginForm";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAuthed();
  return authed ? <Dashboard /> : <LoginForm />;
}
