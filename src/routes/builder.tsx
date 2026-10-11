import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/builder";
import { Protected } from "@/components/protected";

export const Route = createFileRoute("/builder")({
  head: () => ({ meta: [
    { title: "Builder — Vision" },
    { name: "description", content: "Generate code files and full projects, download them as ZIPs, and analyze uploaded project ZIPs." },
    { property: "og:title", content: "Builder — Vision" },
    { property: "og:description", content: "Generate code files and full projects, download them as ZIPs, and analyze uploaded project ZIPs." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RouteComponent,
});
function RouteComponent() { return <Protected><Page /></Protected>; }
