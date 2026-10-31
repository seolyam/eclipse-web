import { notFound } from "next/navigation";
import { OutfitDetail } from "@/components/outfit-detail";
import { OutfitDrawer } from "@/components/outfit-drawer";
import { getOutfit } from "@/lib/data";

export default async function OutfitDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const post = await getOutfit((await params).id);
  if (!post) notFound();
  return (
    <OutfitDrawer title={post.title}>
      <OutfitDetail post={post} heading="h2" />
    </OutfitDrawer>
  );
}
