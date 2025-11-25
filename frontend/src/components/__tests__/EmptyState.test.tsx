import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen } from "@/test/helpers";
import EmptyState from "@/components/common/EmptyState";
import { Inbox } from "lucide-react";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("EmptyState", () => {
  it("renders with required props", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items found"
        description="Get started by creating a new item"
      />
    );

    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(
      screen.getByText("Get started by creating a new item")
    ).toBeInTheDocument();
  });

  it("renders with children", () => {
    render(
      <EmptyState icon={Inbox} title="Empty" description="Description">
        <button>Create New</button>
      </EmptyState>
    );

    expect(
      screen.getByRole("button", { name: "Create New" })
    ).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="Title"
        description="Description"
        className="custom-class"
      />
    );

    const emptyStateDiv = container.querySelector(".custom-class");
    expect(emptyStateDiv).toBeInTheDocument();
  });
});
