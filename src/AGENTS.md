# UI rules (src/)

- The chat composer uses AI Elements PromptInput primitives; its existing file-routing callbacks remain separate from the primitive's attachment collection. Why: preserves ZIP/conversion behavior while sharing accessible input and submission controls.
- Speech text is joined through the browser-safe appendTranscript helper, with regression tests alongside existing tests. Why: preserves typed text and whitespace across recognition updates without coupling transcription to a service.
- Sidebar bottom actions share `SidebarActions`, and Search uses a protected route wrapping a view with browser-only reads of existing chat and task records. Why: keeps navigation consistent without introducing an online backend.
- Incognito uses a dedicated route and workspace-only React state, bypassing history writes, background jobs, and persistent AI generators. Why: temporary messages and attachments must never reach browser storage; replies come from the stateless /api/chat route.
- Specialized Images and Videos routes reuse the Index workspace with a creation mode and reference presets; creation submissions terminate with the explicit unavailable status when the feature isn't set up. Why: preserves the shared layout without text-answer fallbacks or unsupported online calls.
- Sidebar feature links share SidebarFeatures, secondary collection pages share WorkspaceShell, and Library reuses Search filtered to assets. Why: keeps navigation and stored-item discovery consistent.
- Projects use user-scoped workspace_projects through the existing local backend adapter, with creation in a separate view and shared icon definitions. Why: preserves browser-local persistence and consistent icons across creation and listing.
- Library derives applicable file-type filters from the shared search index metadata. Why: avoids separate storage and keeps Search and Library classifications consistent.
