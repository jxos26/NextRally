import { cookies } from "next/headers";

export async function POST() {
  const jar = await cookies();
  jar.delete("nr_admin");
  return Response.json({ ok: true });
}
