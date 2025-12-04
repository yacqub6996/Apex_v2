import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CopyTrading } from "@/pages/copy-trading";
import { CopyTradingService } from "@/api/services/CopyTradingService";

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      balance: 10000,
    },
  }),
}));

describe("CopyTrading page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders copied traders and handles pause/resume/stop actions", async () => {
    const getCopiedTradersSpy = vi
      .spyOn(CopyTradingService, "getCopiedTraders")
      .mockResolvedValue([
        {
          id: "trader-1",
          traderCode: "ABC123",
          displayName: "Test Trader",
          specialty: "Forex",
          riskLevel: "LOW" as const,
          performance: "+5.2%",
          winRate: "65%",
          copyId: "copy-1",
          allocation: 5000,
          status: "ACTIVE" as const,
        },
      ]);

    vi.spyOn(CopyTradingService, "pauseCopyTrading").mockResolvedValue({
      success: true,
      message: "Copy trading paused successfully",
      copiedTrader: {
        id: "trader-1",
        traderCode: "ABC123",
        displayName: "Test Trader",
        specialty: "Forex",
        riskLevel: "LOW",
        performance: "+5.2%",
        winRate: "78%",
        copyId: "copy-1",
        allocation: 1000,
        status: "PAUSED",
      },
      availableBalance: 5000,
    });

    vi.spyOn(CopyTradingService, "resumeCopyTrading").mockResolvedValue({
      success: true,
      message: "Copy relationship resumed",
      copiedTrader: {
        id: "trader-1",
        traderCode: "ABC123",
        displayName: "Test Trader",
        specialty: "Forex",
        riskLevel: "LOW" as const,
        performance: "+5.2%",
        winRate: "65%",
        copyId: "copy-1",
        allocation: 5000,
        status: "ACTIVE" as const,
      },
      availableBalance: 5000,
    });

    vi.spyOn(CopyTradingService, "stopCopyTrading").mockResolvedValue({
      success: true,
      message: "Copy relationship stopped",
      copiedTrader: {
        id: "trader-1",
        traderCode: "ABC123",
        displayName: "Test Trader",
        specialty: "Forex",
        riskLevel: "LOW" as const,
        performance: "+5.2%",
        winRate: "65%",
        copyId: "copy-1",
        allocation: 5000,
        status: "STOPPED" as const,
      },
      availableBalance: 10000,
    });

    vi.spyOn(window, "confirm").mockReturnValue(true);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <CopyTrading />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getCopiedTradersSpy).toHaveBeenCalledTimes(1));

    const traderHeading = await screen.findByText(/Test Trader/);
    expect(traderHeading).toBeInTheDocument();
    const statusBadge = await screen.findByText(/ACTIVE/);
    expect(statusBadge).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /pause/i }));
    await waitFor(() => expect(CopyTradingService.pauseCopyTrading).toHaveBeenCalledWith("copy-1"));
    expect(screen.getByText(/Copy relationship paused/i)).toBeInTheDocument();

    // Simulate the query cache reflecting a paused status so the resume button activates.
    queryClient.setQueryData(["copied-traders"], [
      {
        id: "trader-1",
        traderCode: "ABC123",
        displayName: "Test Trader",
        specialty: "Forex",
        riskLevel: "LOW" as const,
        performance: "+5.2%",
        winRate: "65%",
        copyId: "copy-1",
        allocation: 5000,
        status: "PAUSED" as const,
      },
    ]);

    await user.click(screen.getByRole("button", { name: /resume/i }));
    await waitFor(() => expect(CopyTradingService.resumeCopyTrading).toHaveBeenCalledWith("copy-1"));
    expect(screen.getByText(/Copy relationship resumed/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() => expect(CopyTradingService.stopCopyTrading).toHaveBeenCalledWith("copy-1"));
    expect(screen.getByText(/Copy relationship stopped/i)).toBeInTheDocument();
  });
});
