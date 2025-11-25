import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen } from "@/test/helpers";
import { ProcessingStatusIndicator } from "@/components/ProcessingStatusIndicator";
import type { Meeting } from "@/types/meeting";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ProcessingStatusIndicator", () => {
  it("renders nothing when status is completed", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "completed",
      completed_at: "2025-11-01T10:05:00Z",
      error_message: null,
    };

    const { container } = render(
      <ProcessingStatusIndicator status={status} progress={100} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders error state when processing failed", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "failed",
      completed_at: null,
      error_message: "Transcription service unavailable",
    };

    render(<ProcessingStatusIndicator status={status} progress={0} />);

    expect(screen.getByText("Processing Failed!")).toBeInTheDocument();
    expect(
      screen.getByText("Transcription service unavailable")
    ).toBeInTheDocument();
  });

  it("renders default error message when no error_message provided", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "failed",
      completed_at: null,
      error_message: null,
    };

    render(<ProcessingStatusIndicator status={status} progress={0} />);

    expect(screen.getByText("An unknown error occurred.")).toBeInTheDocument();
  });

  it("renders queued status", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "queued",
      completed_at: null,
      error_message: null,
    };

    render(<ProcessingStatusIndicator status={status} progress={10} />);

    expect(screen.getByText("In queue for processing...")).toBeInTheDocument();
  });

  it("renders transcribing status", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "transcribing",
      completed_at: null,
      error_message: null,
    };

    render(<ProcessingStatusIndicator status={status} progress={50} />);

    expect(screen.getByText("Transcribing audio...")).toBeInTheDocument();
  });

  it("renders analyzing status", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "analyzing",
      completed_at: null,
      error_message: null,
    };

    render(<ProcessingStatusIndicator status={status} progress={75} />);

    expect(screen.getByText("Analyzing transcript...")).toBeInTheDocument();
  });

  it("renders progress bar with correct width", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "transcribing",
      completed_at: null,
      error_message: null,
    };

    const { container } = render(
      <ProcessingStatusIndicator status={status} progress={60} />
    );

    const progressBar = container.querySelector('[style*="width: 60%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("displays auto-update message", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "processing",
      completed_at: null,
      error_message: null,
    };

    render(<ProcessingStatusIndicator status={status} progress={30} />);

    expect(
      screen.getByText("Status will update automatically.")
    ).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "queued",
      completed_at: null,
      error_message: null,
    };

    const { container } = render(
      <ProcessingStatusIndicator
        status={status}
        progress={10}
        className="custom-class"
      />
    );

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("handles uploaded status", () => {
    const status: Meeting["processing_status"] = {
      current_stage: "uploaded",
      completed_at: null,
      error_message: null,
    };

    render(<ProcessingStatusIndicator status={status} progress={5} />);

    expect(screen.getByText("Waiting to be processed...")).toBeInTheDocument();
  });
});
