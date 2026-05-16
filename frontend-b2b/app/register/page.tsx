import { redirect } from "next/navigation";

type SearchParams = Promise<{
  plan?: string;
  company?: string;
  email?: string;
}>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  params.set("intent", resolved.plan === "max" ? "enterprise" : "sample");
  if (resolved.company) params.set("company", String(resolved.company).trim());
  if (resolved.email) params.set("email", String(resolved.email).trim());

  redirect(`/book?${params.toString()}`);
}
