import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Header from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validación criptográfica real de la sesión (el middleware sólo redirige).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <Header user={user} />
      <main>{children}</main>
    </>
  );
}
