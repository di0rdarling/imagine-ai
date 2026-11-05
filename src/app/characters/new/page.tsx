import { Suspense } from "react";
import type { Metadata } from "next";

import { CharacterCreateForm } from "./character-create-form";

export const metadata: Metadata = {
  title: "Create Character",
  description: "Create your unique AI character for interactive story mode.",
};

export default function CreateCharacterPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-3 sm:px-6 py-4">
      <Suspense fallback={<div className="text-center py-10 text-sm text-zinc-500">Loading form…</div>}>
        <CharacterCreateForm />
      </Suspense>
    </main>
  );
}
