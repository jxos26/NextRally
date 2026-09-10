import { cookies } from "next/headers";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return Response.json({ error: "ADMIN_PASSWORD is not set on the server." }, { status: 500 });
  }
  if (password !== expected) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set("nr_admin", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return Response.json({ ok: true });
}
