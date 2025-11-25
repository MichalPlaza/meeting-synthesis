import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen } from "@/test/helpers";
import FeatureCard from "@/components/FeatureCard";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("FeatureCard", () => {
  const mockFeature = {
    title: "Test Feature",
    description: "This is a test feature description",
  };

  it("renders feature title and description", () => {
    render(<FeatureCard feature={mockFeature} />);

    expect(screen.getByText("Test Feature")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test feature description")
    ).toBeInTheDocument();
  });

  it("renders with different feature data", () => {
    const anotherFeature = {
      title: "Another Feature",
      description: "Different description",
    };

    render(<FeatureCard feature={anotherFeature} />);

    expect(screen.getByText("Another Feature")).toBeInTheDocument();
    expect(screen.getByText("Different description")).toBeInTheDocument();
  });

  it("has canvas element for gradient animation", () => {
    const { container } = render(<FeatureCard feature={mockFeature} />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
  });

  it("renders as a Card component", () => {
    const { container } = render(<FeatureCard feature={mockFeature} />);

    // Check for card-related classes or structure
    expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
  });
});
