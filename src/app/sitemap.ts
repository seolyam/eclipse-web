import type { MetadataRoute } from "next";
import { repository } from "@/lib/data";
import { siteUrl } from "@/lib/site";

const ROUTES = ["", "/wardrobe", "/showcase", "/inspector", "/world", "/guide"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const looks = await repository.searchIndex();
  return [
    ...ROUTES.map((path) => ({ url: `${siteUrl}${path || "/"}` })),
    ...looks.map(({ id }) => ({ url: `${siteUrl}/wardrobe/${id}` })),
  ];
}
