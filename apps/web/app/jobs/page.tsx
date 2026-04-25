"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, Search, SlidersHorizontal } from "lucide-react";
import { ShareJobButton } from "@/components/jobs/share-job-button";
import { SiteShell } from "@/components/site-shell";
import { Stars } from "@/components/stars";
import { EmptyState } from "@/components/ui/empty-state";
import { JobCardSkeleton } from "@/components/ui/skeleton";
import { useJobBoard } from "@/hooks/use-job-board";
import { formatDate, formatUsdc, shortenAddress } from "@/lib/format";

/**
 * ErrorBoundary fallback component.
 */
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-md">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-zinc-400 text-center text-sm max-w-md">
        {error.message || "Failed to load the job board. Please check your network connection and try again."}
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2 bg-zinc-100 text-zinc-950 font-bold rounded-lg hover:bg-white transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Simple ErrorBoundary implementation for the page.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}

function JobListContent() {
  const { data: jobs, isLoading, error } = useJobs();
  const [filters, setFilters] = useState<FilterValues>({
    query: "",
    sortBy: "chronological",
    activeTag: "all",
  });

  const deferredQuery = useDeferredValue(filters.query);

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2" role="status" aria-live="polite">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[280px] rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
        ))}
        <span className="sr-only">Loading jobs...</span>
      </div>
    );
  }

  if (error) {
    throw error; // Let ErrorBoundary handle it
  }

  const tags = ["all", ...new Set(jobs?.flatMap((j) => j.tags) || [])];

  let filteredJobs = jobs?.filter((j) => j.status === "open") || [];

  if (filters.activeTag !== "all") {
    filteredJobs = filteredJobs.filter((j) => j.tags.includes(filters.activeTag));
  }

  if (deferredQuery?.trim()) {
    const term = deferredQuery.trim().toLowerCase();
    filteredJobs = filteredJobs.filter((j) =>
      [j.title, j.description, j.client_address, ...j.tags]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (filters.sortBy === "budget") return b.budget_usdc - a.budget_usdc;
    if (filters.sortBy === "reputation") return b.clientReputation.scoreBps - a.clientReputation.scoreBps;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  function resetFilters() {
    actions.setQuery("");
    actions.setActiveTag("all");
    actions.setSortBy("chronological");
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[300px_1fr] gap-12">
      <aside className="lg:sticky lg:top-12 self-start">
        <JobFilters 
          values={filters} 
          onChange={setFilters} 
          tags={tags} 
        />
      </aside>

      <main className="flex-1">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            Showing {sortedJobs.length} active listings
          </h2>
          {isLoading && <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />}
        </div>

        {sortedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10">
            <p className="text-zinc-500 text-sm italic">No jobs found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-amber-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                      {job.status}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                      {job.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShareJobButton
                      path={`/jobs/${job.id}`}
                      title={job.title}
                      className="border-slate-200 bg-white/95"
                    />
                    <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-slate-950" />
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                  {job.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Budget
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatUsdc(job.budget_usdc)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Deadline
                    </p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Clock3 className="h-4 w-4 text-amber-600" />
                      {formatDate(job.deadlineAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Milestones
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {job.milestones} tracked approvals
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Client
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {shortenAddress(job.client_address)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                      <Stars value={job.clientReputation.starRating} />
                      {job.clientReputation.averageStars.toFixed(1)}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {job.clientReputation.totalJobs} completed jobs on-chain
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

        {!loading && jobs.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No open jobs matched that filter"
            description="Try clearing your search and tag filter to surface more opportunities."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-slate-950"
              >
                Reset filters
              </button>
            }
          />
        ) : null}
      </section>
    </SiteShell>
  );
}
