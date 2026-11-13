import { notFound } from "next/navigation";
import { OutfitDetail } from "@/components/outfit-detail";
import { getOutfit } from "@/lib/data";

export default async function OutfitDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const post = await getOutfit((await params).id);
  if (!post) notFound();
  return <OutfitDetail post={post} heading="h2" inDrawer />;
}
