import { cookies } from "next/headers";
import LoginForm from "../components/LoginForm";
import NextRally from "../components/NextRally";

export default async function Page() {
  const jar = await cookies();
  const authed = jar.get("nr_admin")?.value === "ok";
  return authed ? <NextRally /> : <LoginForm />;
}
