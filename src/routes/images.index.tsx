import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/chat";
import { Protected } from "@/components/protected";
export const Route = createFileRoute("/images/")({
  head: () => ({ meta: [
    { title: "Images — Vision" },
    { name: "description", content: "Create images from prompts and visual inspiration in Vision." },
    { property: "og:title", content: "Images — Vision" },
    { property: "og:description", content: "Create images from prompts and visual inspiration in Vision." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RouteComponent,
});
function RouteComponent() { return <Protected><Page creationMode="images" /></Protected>; }
