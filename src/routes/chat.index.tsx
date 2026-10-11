import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/chat";
import { Protected } from "@/components/protected";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "New chat — Vision" },
      { name: "description", content: "New chat in Vision, your all-in-one AI workspace." },
      { property: "og:title", content: "New chat — Vision" },
      { property: "og:description", content: "New chat in Vision, your all-in-one AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <Protected><Page /></Protected>;
}
