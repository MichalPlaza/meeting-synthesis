import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen } from "@/test/helpers";
import userEvent from "@testing-library/user-event";
import ErrorState from "@/components/ErrorState";
import { AlertCircle } from "lucide-react";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ErrorState", () => {
  it("renders with required props", () => {
    const onRetry = vi.fn();

    render(<ErrorState message="Failed to load data" onRetry={onRetry} />);

    expect(screen.getByText("Oops! Something went wrong.")).toBeInTheDocument();
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try Again" })
    ).toBeInTheDocument();
  });

  it("calls onRetry when button is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorState message="Error occurred" onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: "Try Again" });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders with custom title and retry label", () => {
    const onRetry = vi.fn();

    render(
      <ErrorState
        title="Custom Error"
        message="Custom message"
        onRetry={onRetry}
        retryLabel="Reload"
      />
    );

    expect(screen.getByText("Custom Error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("renders with custom icon", () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ErrorState icon={AlertCircle} message="Error" onRetry={onRetry} />
    );

    // Check that the component renders with an icon
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders with children", () => {
    const onRetry = vi.fn();

    render(
      <ErrorState message="Error" onRetry={onRetry}>
        <button>Go Back</button>
      </ErrorState>
    );

    expect(screen.getByRole("button", { name: "Go Back" })).toBeInTheDocument();
  });

  it("has role='alert' for accessibility", () => {
    const onRetry = vi.fn();

    render(<ErrorState message="Error" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
