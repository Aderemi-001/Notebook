
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SmartStudySuggestions from "./SmartStudySuggestions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";

// 1. Mock the dependencies
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock("@/hooks/useAuth", () => ({
    useAuth: vi.fn(),
}));

// Mock toast to avoid errors if triggered
vi.mock("@/utils/toast", () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showLoading: vi.fn(),
    dismissToast: vi.fn(),
}));

// Helper to wrap component in providers
const renderWithProviders = (ui: React.ReactNode) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>{ui}</BrowserRouter>
        </QueryClientProvider>
    );
};

// Helper to mock Supabase chain
const mockSupabaseChain = (sets: any[], cards: any[], progress: any[]) => {
    // We mock the chain: .from() -> .select() -> .eq() -> returns { data }
    (supabase.from as any).mockImplementation((table: string) => {
        return {
            select: () => {
                // Handle inner join syntax or regular select
                return {
                    eq: () => {
                        // Return appropriate data based on table
                        if (table === "study_sets") return Promise.resolve({ data: sets });
                        if (table === "cards") return Promise.resolve({ data: cards });
                        if (table === "user_progress") return Promise.resolve({ data: progress });
                        return Promise.resolve({ data: [] });
                    },
                    // Handle chained filter for cards (inner join)
                    in: () => Promise.resolve({ data: cards })
                };
            },
            // Handle delete/insert etc if needed, but we only read here
        };
    });
};

describe("SmartStudySuggestions Logic", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ user: { id: "test-user" } });
    });

    it("RULE 1: Prioritizes 'New Set' (Priority 999) above everything else", async () => {
        // Setup: 
        // Set A: New (No progress)
        // Set B: Due (Has progress, due now)
        const sets = [
            { id: "set-a", title: "New Physics" },
            { id: "set-b", title: "Old Math" }
        ];
        const cards = [
            { id: "card-1", set_id: "set-a" }, // New
            { id: "card-2", set_id: "set-b" }  // Old
        ];
        const progress = [
            {
                card_id: "card-2",
                next_review_at: new Date(Date.now() - 10000).toISOString(), // Due in past
                repetition_level: 1,
                last_reviewed_at: new Date().toISOString()
            }
        ];

        mockSupabaseChain(sets, cards, progress);

        renderWithProviders(<SmartStudySuggestions />);

        // Expect "New Physics" to be the FIRST card because priority 999 > due count
        await waitFor(() => {
            // We look for h4 titles. 
            // Note: The component renders title in <h4 className="font-semibold text-lg line-clamp-1">{suggestion.title}</h4>
            const titles = screen.getAllByRole("heading", { level: 4 });
            expect(titles[0]).toHaveTextContent("New Physics"); // Rule 1
            expect(titles[1]).toHaveTextContent("Old Math");    // Rule 2
        });

        expect(screen.getByText("New set - Start learning")).toBeInTheDocument();
    });

    it("RULE 2: Shows 'Due' items when no new sets exist", async () => {
        const sets = [{ id: "set-b", title: "Old Math" }];
        const cards = [{ id: "card-2", set_id: "set-b" }];
        // Card is due
        const progress = [{
            card_id: "card-2",
            next_review_at: new Date(Date.now() - 10000).toISOString(),
            repetition_level: 1,
            last_reviewed_at: new Date().toISOString()
        }];

        mockSupabaseChain(sets, cards, progress);

        renderWithProviders(<SmartStudySuggestions />);

        await waitFor(() => {
            expect(screen.getByText("Old Math")).toBeInTheDocument();
            expect(screen.getByText(/cards due for review/)).toBeInTheDocument();
        });
    });

    it("RULE 3: Shows 'Decay' ONLY if nothing is due", async () => {
        // Setup: Card reviewed 10 days ago, NOT due yet (future date)
        const sets = [{ id: "set-c", title: "Ancient History" }];
        const cards = [{ id: "card-3", set_id: "set-c" }];

        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        const progress = [{
            card_id: "card-3",
            next_review_at: futureDate.toISOString(), // Not due!
            repetition_level: 3,
            last_reviewed_at: tenDaysAgo.toISOString() // Studied long ago
        }];

        mockSupabaseChain(sets, cards, progress);

        renderWithProviders(<SmartStudySuggestions />);

        await waitFor(() => {
            expect(screen.getByText("Ancient History")).toBeInTheDocument();
            // Should trigger decay logic because dueCount is 0 but lastStudied > 5 days
            expect(screen.getByText(/Refresh memory/)).toBeInTheDocument();
        });
    });

    it("PREVENTS CONFLICT: Does NOT show decay if cards are explicitly Due", async () => {
        // Setup: Card reviewed 10 days ago AND it is Due now.
        // Logic should prefer "Due" (Rule 2) over "Decay" (Rule 3)
        const sets = [{ id: "set-d", title: "Urgent Set" }];
        const cards = [{ id: "card-4", set_id: "set-d" }];

        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const progress = [{
            card_id: "card-4",
            next_review_at: tenDaysAgo.toISOString(), // Due!
            repetition_level: 1,
            last_reviewed_at: tenDaysAgo.toISOString()
        }];

        mockSupabaseChain(sets, cards, progress);

        renderWithProviders(<SmartStudySuggestions />);

        await waitFor(() => {
            // Should say "Due" not "Refresh"
            expect(screen.getByText(/cards due/)).toBeInTheDocument();
            expect(screen.queryByText(/Refresh memory/)).not.toBeInTheDocument();
        });
    });
});
