import { ArrowLeft, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CURRENT_VERSION } from "@/data/changelog";

// =============================================================================
// User Manual — the in-app "how does this work" page.
//
// IMPORTANT: this is the source of truth for end-user documentation. Treat
// it the way you treat the About-page diagrams: any user-visible feature
// change should update the relevant section here in the SAME commit.
// CLAUDE.md's "Architectural changes" rules apply to this file too.
//
// Sections are independent — pick a section in the sidebar and you land on
// the right anchor. Keep section ids stable when editing so deep links from
// outside don't break.
// =============================================================================

interface Section {
  id: string;
  title: string;
}

const SECTIONS: Section[] = [
  { id: "quick-start", title: "Quick start" },
  { id: "dashboard", title: "The Dashboard" },
  { id: "list-view", title: "Task List view" },
  { id: "kanban", title: "Kanban board" },
  { id: "tasks", title: "Working with tasks" },
  { id: "comments", title: "Comments & @-mentions" },
  { id: "test-sheets", title: "Test Sheets" },
  { id: "filters", title: "Filtering & search" },
  { id: "notifications", title: "Notifications" },
  { id: "undo", title: "Undo & confirmation" },
  { id: "mobile", title: "Using on mobile" },
  { id: "troubleshooting", title: "Troubleshooting" },
];

export function ManualView() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5">
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-fg-muted" />
          <h1 className="font-display text-xl font-semibold text-fg sm:text-2xl">User Manual</h1>
          <span className="ml-auto text-xs text-fg-muted">v{CURRENT_VERSION}</span>
        </div>
        <p className="text-sm leading-relaxed text-fg-muted">
          How to use the Altronic Engineering Task System. Pick a topic on the left,
          or scroll through. This page is part of the app — when features change,
          this manual updates with them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Table of contents — sticky on desktop */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
              Contents
            </div>
            <nav className="flex flex-col gap-0.5 text-sm">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="rounded-md px-2 py-1 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <article className="flex flex-col gap-8 leading-relaxed text-fg">
          <Section id="quick-start" title="Quick start">
            <P>
              Sign in with your <code>@altronic-llc.com</code> Microsoft account when
              prompted. Once you're in, the <strong>Dashboard</strong> opens with a
              summary of your open work. Use the top nav to switch between the
              Dashboard, the task <strong>List</strong>, the <strong>Kanban</strong>{" "}
              board, and the <strong>Test Sheets</strong> log. Your tasks are filtered
              to you by default — pick "Anyone" in the Assigned filter to see the rest
              of the team's work.
            </P>
            <Tip>
              All four views share the same data — a change you make in one shows up
              in the others within seconds.
            </Tip>
          </Section>

          <Section id="dashboard" title="The Dashboard">
            <P>
              The home page after sign-in. Five big-number cards show open-work
              counts:
            </P>
            <UL>
              <LI>
                <strong>My Open Tasks</strong> — assigned to you and not Complete.
                Click to open the List view with that filter.
              </LI>
              <LI>
                <strong>All Open Tasks</strong> — the team's active backlog. Click to
                open the List view with all assignees.
              </LI>
              <LI>
                <strong>EIRs</strong> (Engineering Information Requests),{" "}
                <strong>ECNs</strong> (Engineering Change Notices), and{" "}
                <strong>Build Requests</strong> show mock counts today — those
                SharePoint lists aren't wired up yet. They'll switch to real numbers
                automatically once the lists exist.
              </LI>
            </UL>
            <P>
              Below the cards is a <strong>Task status breakdown</strong> panel —
              mini bars showing how your (or the team's) tasks are split across
              statuses. Toggle <strong>Mine / Company</strong> in the panel header to
              switch scope. Click any bar to jump to the List filtered to that status.
            </P>
            <P>
              The <strong>Filter by Project</strong> dropdown at the top of the page
              scopes every number on the dashboard to a single project. Pick a
              project and every card + the breakdown panel re-counts for it.
            </P>
          </Section>

          <Section id="list-view" title="Task List view">
            <P>
              <code>/list</code> — every task in one scrollable list. The top of the
              page has:
            </P>
            <UL>
              <LI>
                <strong>Status pills</strong> — quick filters for Active, Backlog,
                In Progress, On Hold, Blocked, Complete. The counts update as you
                change the other filters below.
              </LI>
              <LI>
                <strong>Filter bar</strong> — Project Reference, Assigned, Created
                By (each multi-select with type-to-search), plus a free-text Search
                field that matches title, description, comments, and the numbered
                title.
              </LI>
              <LI>
                <strong>New Task</strong> button — opens the create form (see{" "}
                <a href="#tasks" className="text-accent underline-offset-2 hover:underline">
                  Working with tasks
                </a>
                ).
              </LI>
            </UL>
            <P>
              Click any row to open the task's detail page. Filters live in the URL,
              so you can bookmark or share a filtered view as a link.
            </P>
          </Section>

          <Section id="kanban" title="Kanban board">
            <P>
              <code>/kanban</code> — every task as a card grouped by status. Six
              columns: Backlog → Selected for Development → In Progress → On Hold →
              Blocked → Complete.
            </P>
            <UL>
              <LI>
                <strong>Drag a card</strong> across columns to change its status.
                Works on desktop and tablet. On phones, drag is disabled to keep
                horizontal scrolling smooth — tap a card to open it and change the
                status from there.
              </LI>
              <LI>
                <strong>Click a card</strong> to open the task detail page.
              </LI>
              <LI>The same filter bar from the List view applies here too.</LI>
            </UL>
          </Section>

          <Section id="tasks" title="Working with tasks">
            <H3>Creating a task</H3>
            <P>
              Click <strong>New Task</strong> from the List, Kanban, or Dashboard.
              Fields:
            </P>
            <UL>
              <LI>
                <strong>Title</strong> (required) — short summary.
              </LI>
              <LI>
                <strong>Parent Project</strong> (required) — the project this task
                belongs to. The number prefix in the resulting{" "}
                <strong>NumberedTitle</strong> (e.g.{" "}
                <code>T15-0017-Endurance run</code>) is generated from this.
              </LI>
              <LI>
                <strong>Status, Priority, Category, Due Date, Labels</strong> —
                optional metadata.
              </LI>
              <LI>
                <strong>Assigned / Watchers</strong> — searchable dropdowns of team
                members. Multi-select; pick everyone who should be on this task.
              </LI>
              <LI>
                <strong>Description, Software Revision</strong> — free-text fields.
              </LI>
              <LI>
                <strong>Parent Task / Related Projects</strong> — for tasks that
                belong under a larger one or touch multiple projects.
              </LI>
            </UL>
            <P>
              On submit, the app auto-generates the NumberedTitle as{" "}
              <code>T&#123;n&#125;-&#123;projectRef&#125;-&#123;title&#125;</code>{" "}
              where <em>n</em> is the count of existing tasks under that project + 1,
              and the project ref is the four-character code prefix (e.g.{" "}
              <code>0017</code> for "0017-AMP-5000 Refresh").
            </P>
            <H3>Editing a task</H3>
            <P>
              On the task detail page, the <strong>right sidebar</strong> lets you
              change status, priority, category, due date, labels, parent task,
              parent project, related projects, assignees, watchers, and software
              revision inline — no need to open a separate form. Every change is
              optimistic: the UI updates the moment you click, SharePoint catches up
              in the background.
            </P>
            <P>
              The <strong>Edit</strong> button at the top of the detail page opens
              the full task form for bulk edits of title + description in one go.
            </P>
            <H3>Marking complete</H3>
            <P>
              Use the <strong>Mark Complete</strong> button on the task detail page,
              or change the Status to "Complete" via the dropdown, or drag the card
              to the Complete column on the Kanban.
            </P>
          </Section>

          <Section id="comments" title="Comments & @-mentions">
            <P>
              Every task has a comments thread. To post: scroll down the detail page
              and use the composer.
            </P>
            <H3>@-mentioning someone</H3>
            <P>
              Type <code>@</code> in the composer. A dropdown opens with everyone
              who's been an assignee or watcher across the team. Use arrow keys to
              highlight + Enter to pick, or click. The mention becomes a styled chip
              in your comment and the mentioned person receives an email
              notification when you send.
            </P>
            <Tip>
              You <em>can</em> mention yourself — useful as a "remind me later" that
              lands in your inbox.
            </Tip>
            <H3>Attachments</H3>
            <P>
              Drag a file onto the composer, or click <strong>Attach</strong>.
              Multiple files OK; previewed inline. Image attachments show up in the
              comment and also ride along on the @-mention email as proper email
              attachments.
            </P>
            <H3>Editing your own comments</H3>
            <P>
              A pencil icon appears next to comments you authored. Click it to edit
              in place. Editing won't re-spam mentions that were already there — only
              newly added mentions get an email.
            </P>
            <H3>Sending and confirmation</H3>
            <P>
              Press <kbd className="rounded border border-border bg-bg px-1 py-0.5 text-[10px]">Ctrl</kbd>
              +
              <kbd className="rounded border border-border bg-bg px-1 py-0.5 text-[10px]">Enter</kbd>{" "}
              to send, or click <strong>Send</strong>. Comments appear in the thread
              immediately; the network round-trip to SharePoint happens in the
              background.
            </P>
          </Section>

          <Section id="test-sheets" title="Test Sheets">
            <P>
              The <strong>Test Sheets</strong> tab in the top nav lists every entry
              from the SharePoint "Test Results" list — engineering test records
              with their product, serial number, purpose, results, test date, and
              the responsible tester.
            </P>
            <H3>Creating one</H3>
            <P>
              Either click <strong>New Test Sheet</strong> on the Test Sheets page
              for a blank form, or click <strong>New Test Sheet</strong> on a task's
              detail page to create one with that task's Parent Project and Task
              Reference pre-filled (and locked — you're explicitly creating a sheet
              for THIS task).
            </P>
            <H3>Editing</H3>
            <P>
              Click a row in the Test Sheets list to open the detail page, then click{" "}
              <strong>Edit</strong> to open the form. Same fields as create. Saves
              are optimistic, with toast + undo on every change.
            </P>
            <H3>Cross-referencing</H3>
            <P>
              When a task has test sheets linked to it, they appear as a list of
              clickable pills below the task description. Open any test sheet
              detail page and the <strong>Project Reference</strong> + <strong>Task
              Reference</strong> in the sidebar are clickable links back to those
              records.
            </P>
          </Section>

          <Section id="filters" title="Filtering & search">
            <P>
              The filter bar appears on the List, Kanban, and Test Sheets views and
              has the same shape everywhere:
            </P>
            <UL>
              <LI>
                <strong>Project Reference</strong> — multi-select. Pick one or many
                to scope the view to specific projects.
              </LI>
              <LI>
                <strong>Assigned</strong> — multi-select. Defaults to "you" so the
                first thing you see is your own work.
              </LI>
              <LI>
                <strong>Search</strong> — free text. Matches title, numbered title,
                description, and comment bodies.
              </LI>
              <LI>
                <strong>Created By</strong> — single-select. Filter to tasks created
                by a particular person.
              </LI>
            </UL>
            <P>
              Every multi-select dropdown has a search box at the top for finding a
              specific name or project quickly. Pick "Anyone" (or click the ✕ on the
              dropdown) to clear that filter.
            </P>
            <Tip>
              Filters live in the URL (<code>?assigned=…&amp;project=…</code>) — so you
              can bookmark a particular view or share it as a link.
            </Tip>
          </Section>

          <Section id="notifications" title="Notifications">
            <H3>Email — @-mentions</H3>
            <P>
              When you @-mention someone in a comment, they receive an email from{" "}
              <strong>automation@altronic-llc.com</strong> with a greeting, the task
              name, the comment quoted, and a button to open the task. Any
              attachments you added ride along as email attachments.
            </P>
            <P>
              Editing a comment to add a NEW mention emails just the new person.
              Existing mentions don't get re-spammed.
            </P>
            <H3>Watching a task</H3>
            <P>
              Click <strong>Watch</strong> on the task detail page to add yourself
              to the watchers list. Power Automate flows running on the SharePoint
              list send watchers email updates when the task is changed or
              commented on. Click <strong>Watching</strong> again to stop.
            </P>
          </Section>

          <Section id="undo" title="Undo & confirmation">
            <P>
              Every change you make — status, priority, due date, parent project,
              assignees, watchers, etc. — surfaces a confirmation toast at the
              bottom-right of the screen. Most carry an <strong>Undo</strong>{" "}
              button.
            </P>
            <P>
              Click Undo within ~7 seconds of an accidental change and the previous
              value is restored both in the UI and on SharePoint. After that the
              toast dismisses and the change is locked in.
            </P>
            <P>
              If a write fails, a red toast tells you what went wrong and the change
              automatically rolls back — you don't have to do anything.
            </P>
            <P>
              The mutations that <em>don't</em> have Undo: comment add (SharePoint
              doesn't expose delete-a-comment), task create (we'd have to delete the
              newly-created task and renumber), and project create. You'll see a
              confirmation but no Undo button.
            </P>
          </Section>

          <Section id="mobile" title="Using on mobile">
            <P>The app works on phones and tablets with a few intentional differences:</P>
            <UL>
              <LI>
                <strong>Phone (&lt; 640 px)</strong> — Kanban drag is disabled to
                keep horizontal scrolling smooth. Tap a card to open it; change the
                status from the detail page. Detail forms stack vertically for
                readability.
              </LI>
              <LI>
                <strong>Tablet / desktop</strong> — drag works normally. List view
                shows full task rows; sidebar editor opens beside the description.
              </LI>
              <LI>
                <strong>Theme toggle</strong> at the top-right (Sun / Moon) switches
                between light and dark. Your choice is remembered per browser.
              </LI>
            </UL>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <H3>"Loading tasks…" hangs forever</H3>
            <P>
              Usually a sign-in / permission issue. F12 → Console: a 401 means your
              token expired (sign out + sign in). A 403 means the app doesn't have
              read access to the SharePoint site — talk to IT.
            </P>
            <H3>A change didn't stick</H3>
            <P>
              If the toast turned red, the SharePoint write was rejected — open the
              task again to confirm. If the toast was green but the change reverted
              on refresh, someone else may have changed the same field at the same
              time; reapply your change.
            </P>
            <H3>I don't see my new task</H3>
            <P>
              The default Assigned filter is set to your email. If you created a
              task for someone else, it won't appear in the default list view — pick
              "Anyone" in the Assigned filter, or change the URL's{" "}
              <code>assigned</code> parameter.
            </P>
            <H3>Mention email didn't arrive</H3>
            <P>Most common reasons in order:</P>
            <UL>
              <LI>
                You typed <code>@Name</code> manually instead of picking from the
                dropdown — without selecting a person from the menu, the chip's
                <code>data-email</code> is missing and the email path skips it.
              </LI>
              <LI>
                The recipient's email is spelled differently in SharePoint than the
                user expects. Pick them from the dropdown to make sure the address
                is right.
              </LI>
              <LI>
                The shared mailbox setup or Send-As permission isn't fully done on
                IT's end. Re-check with them.
              </LI>
            </UL>
            <H3>Something else broken</H3>
            <P>
              The contact for the app is in the footer. Include what you were doing,
              what you expected, what happened, and the version number from the
              footer.
            </P>
          </Section>
        </article>
      </div>
    </div>
  );
}

// =============================================================================
// Tiny presentational helpers — keep the body terse and the styles in one place.
// =============================================================================

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="mb-3 font-display text-lg font-semibold text-fg sm:text-xl">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 font-display text-sm font-semibold uppercase tracking-wider text-fg-muted">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-fg">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="ml-5 list-disc space-y-1 text-sm text-fg">{children}</ul>;
}

function LI({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-fg">
      <strong className="text-accent">Tip:</strong> {children}
    </div>
  );
}
