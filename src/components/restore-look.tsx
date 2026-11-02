"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { restoreLook } from "@/app/actions";
import { useAccount } from "@/lib/use-account";

/** A moderator keeps a reported look. Deleting it is the Delete button's job. */
export function RestoreLook({ id }: { id: string }) {
  const [account] = useAccount();
  const [restoring, start] = useTransition();
  const router = useRouter();

  if (!account?.moderator) return null;

  return (
    <button
      type="button"
      className="pill"
      disabled={restoring}
      onClick={() =>
        start(async () => {
          const r = await restoreLook(id);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success("Look restored");
          router.refresh();
        })
      }
    >
      {restoring ? "Restoring" : "Keep look"}
    </button>
  );
}
