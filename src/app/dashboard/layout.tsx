import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Header from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validacion criptografica real de la sesion (el middleware solo redirige).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <Header user={user} />
      <main>{children}</main>
    </>
  );
}
