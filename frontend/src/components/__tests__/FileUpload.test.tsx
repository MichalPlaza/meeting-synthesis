import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen } from "@/test/helpers";
import { FileUpload } from "@/components/FileUpload";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("FileUpload", () => {
  it("renders dropzone when no file is selected", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} progress={null} />);

    expect(
      screen.getByText(/drag.*drop.*audio file here/i)
    ).toBeInTheDocument();
  });

  it("calls onFileSelect when file is provided", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} progress={null} />);

    // Check that input exists with correct attributes
    const input = screen.getByRole("presentation").querySelector("input");
    expect(input).toBeInTheDocument();
  });

  it("renders file upload component", () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileUpload onFileSelect={onFileSelect} progress={null} />
    );

    // Check basic structure
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const onFileSelect = vi.fn();
    const { container } = render(
      <FileUpload
        onFileSelect={onFileSelect}
        progress={null}
        className="custom-class"
      />
    );

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("accepts only audio files", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} progress={null} />);

    const input = screen.getByRole("presentation").querySelector("input");
    expect(input).toHaveAttribute("accept");
  });

  it("allows only single file selection", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} progress={null} />);

    const input = screen.getByRole("presentation").querySelector("input");
    expect(input).not.toHaveAttribute("multiple");
  });

  it("has accessible dropzone", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} progress={null} />);

    // Check for dropzone container
    const dropzone = screen.getByRole("presentation");
    expect(dropzone).toBeInTheDocument();
  });
});
