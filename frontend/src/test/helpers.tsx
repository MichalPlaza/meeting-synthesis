import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export { customRender as render };
export * from "@testing-library/react";
