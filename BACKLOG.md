# Backlog

Queued work for upcoming releases. Items at the top are highest-priority /
next-up. When picking something up, move it to a release in `CHANGELOG.ts`
(via the changelog protocol in `CLAUDE.md`) and delete it from this list.

This is intentionally informal — a running list of "things we want, in
roughly the order we want them." No tickets, no story points. If an item
needs detail, add a sub-bullet underneath it.

---

## Next up

(empty — last batch shipped in v0.2.0)

## Later

(empty)

## Done / shipped

When an item ships, move it into the corresponding CHANGELOG entry in
`src/data/changelog.ts` and delete it from this file. Don't keep a
"shipped" section here — the changelog is the record of what's done.

---

## Followups from the v0.2.0 batch

These are not formal backlog items, but flagging in case you want to track
them after a real-mode shakedown:

- **Verify the parent-task field's actual internal name** in SharePoint.
  The mapper assumes `ParentTaskLookupId`; if the column is named
  something else (e.g. `Parent_x0020_Task_x0020_ReferLookupId`), update
  `src/lib/taskMapper.ts` and the GraphItemFields typedef.
- **Verify the multi-value related-projects field's internal name** —
  currently assumed to be `ProjectReference`. If it's not, same edits as
  above plus `ProjectReference` references throughout.
- **Verify the projects-list ID** and set `VITE_SP_PROJECTS_LIST_ID`. Run
  the lookup-discovery PowerShell snippet from CLAUDE.md once the parent
  app registration is in place.
- **Upload attachments to a SharePoint document library** in real mode.
  Today attachments are in-memory only (mock mode behavior). When the
  storage rules are decided, add the upload step inside `addComment` in
  `src/api/tasks.ts` — the `attachments` argument is already plumbed
  through; just needs the upload-to-SharePoint code.
- **Replace hardcoded admin allow-list** with SharePoint group
  membership. See `src/hooks/useIsAdmin.ts` for the current approach
  and TODO comment.
- **Resolve SharePoint user lookupIds at sign-in.** Today the watch
  button and assignee writes rely on email matching in mock mode, and
  on the lookupId being already present (from people already on tasks)
  in real mode. For a clean person-add UX when the user has never been
  on any task before, we need a one-time call to resolve the signed-in
  user's site-user ID.
