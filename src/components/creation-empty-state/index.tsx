import { creationReferences, referencePrompt, type CreationMode } from "@/lib/creation-references";

export default function CreationEmptyState({ mode, onPromptClick }: { mode: CreationMode; onPromptClick: (prompt: string) => void }) {
  return <div className="px-4 pb-6 pt-2 animate-fade-up">
    <div className="mb-4 flex gap-2"><span className="rounded-full bg-secondary px-5 py-2 text-base font-semibold text-foreground">Trending</span></div>
    <div aria-label={`${mode} reference previews`} className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
      {creationReferences.map((reference, index) => <button key={reference.name} type="button" aria-label={`Create ${reference.name.toLowerCase()}`} title={reference.name} onClick={() => onPromptClick(referencePrompt(index, mode))}
        className="group relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img src={reference.image} alt={reference.name} width={384} height={384} loading={index > 3 ? "lazy" : "eager"} className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent px-4 pb-3 pt-10 text-base font-semibold text-foreground">{reference.name}</span>
      </button>)}
    </div>
  </div>;
}
