import { NextResponse } from "next/server";
import { repository } from "@/lib/data";

// The command menu's list, read when the menu first opens. Public rows only.
export async function GET() {
  return NextResponse.json(await repository.searchIndex(), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
