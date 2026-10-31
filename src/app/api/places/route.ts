import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces } from "@/lib/catalog";

export function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  return NextResponse.json(searchPlaces(q));
}
