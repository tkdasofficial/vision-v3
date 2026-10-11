import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/chat";
import { Protected } from "@/components/protected";

export const Route = createFileRoute("/chat/$chatId")({
  head: () => ({
    meta: [
      { title: "Chat — Vision" },
      { name: "description", content: "Chat in Vision, your all-in-one AI workspace." },
      { property: "og:title", content: "Chat — Vision" },
      { property: "og:description", content: "Chat in Vision, your all-in-one AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <Protected><Page /></Protected>;
}
