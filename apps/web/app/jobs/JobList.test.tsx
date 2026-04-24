import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import JobsPage from "./page";
import * as jobQueries from "../../hooks/job-queries";

// Mock the query hook to isolate UI testing from network/msw logic in this unit test
vi.mock("../../hooks/job-queries", () => ({
  useJobs: vi.fn(),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockJobs: jobQueries.BoardJob[] = [
  {
    id: "1",
    title: "Senior Soroban Developer",
    description: "Build an escrow system on Stellar.",
    budget_usdc: 5000 * 10_000_000,
    status: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ["soroban", "stellar"],
    deadlineAt: new Date().toISOString(),
    client_address: "GABC123",
    clientReputation: {
      scoreBps: 9000,
      totalJobs: 5,
      totalPoints: 45,
      reviews: 5,
      starRating: 5,
      averageStars: 5,
    },
  },
];

describe("JobList / JobsPage CI Audit", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it("renders the job list after successful data fetch", async () => {
    (jobQueries.useJobs as any).mockReturnValue({
      data: mockJobs,
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <JobsPage />
      </QueryClientProvider>
    );

    // Use findBy to account for micro-task timing and CI latency
    const title = await screen.findByText("Senior Soroban Developer");
    expect(title).toBeDefined();
    
    const status = await screen.findByLabelText(/Job status: open/);
    expect(status).toBeDefined();
  });

  it("shows skeleton state while loading", () => {
    (jobQueries.useJobs as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <JobsPage />
      </QueryClientProvider>
    );

    const loadingState = screen.getByRole("status");
    expect(loadingState).toBeDefined();
    expect(screen.getByText(/Loading jobs.../i)).toBeDefined();
  });

  it("triggers Error Boundary on fetch failure", async () => {
    // Simulate a hard error that should bubble up to the ErrorBoundary
    (jobQueries.useJobs as any).mockImplementation(() => {
      throw new Error("Network Disruption");
    });

    // Suppress console.error for this expected error to keep CI logs clean
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <QueryClientProvider client={queryClient}>
        <JobsPage />
      </QueryClientProvider>
    );

    const errorHeading = await screen.findByText("Something went wrong");
    expect(errorHeading).toBeDefined();
    expect(screen.getByText(/Network Disruption/i)).toBeDefined();
    
    spy.mockRestore();
  });
});
