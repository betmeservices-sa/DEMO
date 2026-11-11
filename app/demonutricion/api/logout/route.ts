import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/nutricion/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/demonutricion", maxAge: 0 });
  return res;
}
