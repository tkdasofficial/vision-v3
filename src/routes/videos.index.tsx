import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/chat";
import { Protected } from "@/components/protected";
export const Route = createFileRoute("/videos/")({
  head: () => ({ meta: [
    { title: "Videos — Vision" },
    { name: "description", content: "Create videos from prompts and cinematic visual references in Vision." },
    { property: "og:title", content: "Videos — Vision" },
    { property: "og:description", content: "Create videos from prompts and cinematic visual references in Vision." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RouteComponent,
});
function RouteComponent() { return <Protected><Page creationMode="videos" /></Protected>; }
