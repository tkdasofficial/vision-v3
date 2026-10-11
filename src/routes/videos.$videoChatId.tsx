import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/chat";
import { Protected } from "@/components/protected";
export const Route = createFileRoute("/videos/$videoChatId")({
  head: () => ({ meta: [
    { title: "Video chat — Vision" },
    { name: "description", content: "Continue a video creation chat in Vision." },
    { property: "og:title", content: "Video chat — Vision" },
    { property: "og:description", content: "Continue a video creation chat in Vision." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RouteComponent,
});
function RouteComponent() { return <Protected><Page creationMode="videos" /></Protected>; }
