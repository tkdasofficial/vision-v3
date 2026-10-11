import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/chat";
import { Protected } from "@/components/protected";
export const Route = createFileRoute("/images/$imageChatId")({
  head: () => ({ meta: [
    { title: "Image chat — Vision" },
    { name: "description", content: "Continue an image creation chat in Vision." },
    { property: "og:title", content: "Image chat — Vision" },
    { property: "og:description", content: "Continue an image creation chat in Vision." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RouteComponent,
});
function RouteComponent() { return <Protected><Page creationMode="images" /></Protected>; }
