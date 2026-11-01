import { NextResponse, type NextRequest } from "next/server";
import { searchItems } from "@/lib/catalog";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get("q") ?? "").slice(0, 60);
  return NextResponse.json(searchItems(q, Number(searchParams.get("slot") ?? -1)));
}
