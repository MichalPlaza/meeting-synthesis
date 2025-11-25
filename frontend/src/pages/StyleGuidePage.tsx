import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  FolderOpen,
  Mic,
  AlertTriangle,
  Info,
  CheckCircle2,
  Bell,
  Terminal,
} from "lucide-react";
import ProjectCardSkeleton from "@/components/features/projects/ProjectCardSkeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const colorPalette = [
  { name: "Background", variable: "--background", className: "bg-background" },
  { name: "Foreground", variable: "--foreground", className: "bg-foreground" },
  { name: "Card", variable: "--card", className: "bg-card" },
  { name: "Primary", variable: "--primary", className: "bg-primary" },
  {
    name: "Primary FG",
    variable: "--primary-foreground",
    className: "bg-primary-foreground",
  },
  { name: "Secondary", variable: "--secondary", className: "bg-secondary" },
  {
    name: "Secondary FG",
    variable: "--secondary-foreground",
    className: "bg-secondary-foreground",
  },
  { name: "Muted", variable: "--muted", className: "bg-muted" },
  {
    name: "Muted FG",
    variable: "--muted-foreground",
    className: "bg-muted-foreground",
  },
  { name: "Accent", variable: "--accent", className: "bg-accent" },
  {
    name: "Destructive",
    variable: "--destructive",
    className: "bg-destructive",
  },
  { name: "Success", variable: "--success", className: "bg-success" },
  { name: "Warning", variable: "--warning", className: "bg-warning" },
  { name: "Info", variable: "--info", className: "bg-info" },
  { name: "Border", variable: "--border", className: "bg-border" },
  { name: "Input", variable: "--input", className: "bg-input" },
];

function StyleGuidePage() {
  return (
    <div className="space-y-16 py-8">
      <header className="space-y-2">
        <h1>Design System</h1>
        <p className="lead">
          A comprehensive style guide and component library for the Meeting
          Synthesis application.
        </p>
      </header>

      {/* FOUNDATIONS */}
      <section className="space-y-8">
        <h2 className="pb-4 border-b">Foundations</h2>

        {/* Colors */}
        <article className="space-y-4">
          <h3>Colors</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {colorPalette.map((color) => (
              <div key={color.name} className="space-y-1.5">
                <div
                  className={`h-16 w-full rounded-[var(--radius-container)] border ${color.className}`}
                />
                <div className="px-1">
                  <p className="text-sm font-medium">{color.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {color.variable}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Typography */}
        <article className="space-y-4">
          <h3>Typography</h3>
          <div className="space-y-4 p-6 bg-card rounded-[var(--radius-container)] border">
            <h1>H1: The quick brown fox jumps over the lazy dog.</h1>
            <h2>H2: The quick brown fox jumps over the lazy dog.</h2>
            <h3>H3: The quick brown fox jumps over the lazy dog.</h3>
            <h4>H4: The quick brown fox jumps over the lazy dog.</h4>
            <p>This is a standard paragraph (`p` tag).</p>
            <p className="lead">This is a lead paragraph (class `.lead`).</p>
            <p className="subtle">
              This is a subtle paragraph (class `.subtle`).
            </p>
            <a href="#" className="link">
              This is a sample link (class `.link`).
            </a>
          </div>
        </article>
      </section>

      {/* COMPONENTS */}
      <section className="space-y-8">
        <h2 className="pb-4 border-b">Components</h2>

        {/* Buttons */}
        <article className="space-y-4">
          <h3>Buttons</h3>
          <p className="subtle">
            Hover and focus on buttons to see their states.
          </p>
          <div className="space-y-6 p-6 bg-card rounded-[var(--radius-container)] border">
            {[
              "default",
              "secondary",
              "outline",
              "destructive",
              "ghost",
              "link",
            ].map((variant) => (
              <div key={variant} className="flex items-center gap-4 flex-wrap">
                <span className="w-24 font-mono text-sm capitalize">
                  {variant}
                </span>
                <Button variant={variant as any} size="lg">
                  Large Button
                </Button>
                <Button variant={variant as any}>Default Button</Button>
                <Button variant={variant as any} size="sm">
                  Small Button
                </Button>
                <Button variant={variant as any} size="icon">
                  <Bell />
                </Button>
                <Button variant={variant as any} disabled>
                  Disabled
                </Button>
              </div>
            ))}
          </div>
        </article>

        {/* Form Controls */}
        <article className="space-y-4">
          <h3>Form Controls</h3>
          <div className="space-y-6 p-6 bg-card rounded-[var(--radius-container)] border grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Input placeholder="Default Input" />
              <Input placeholder="Disabled Input" disabled />
              <Textarea placeholder="Default Textarea" />
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="cb-1" />
                <Label htmlFor="cb-1">Default Checkbox</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="cb-2" checked />
                <Label htmlFor="cb-2">Checked Checkbox</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="cb-3" disabled />
                <Label htmlFor="cb-3">Disabled Checkbox</Label>
              </div>
            </div>
          </div>
        </article>

        {/* Alerts & Toasts */}
        <article className="space-y-4">
          <h3>Alerts & Toasts</h3>
          <div className="space-y-4 p-6 bg-card rounded-[var(--radius-container)] border">
            <h4 className="text-base font-semibold">Alerts</h4>
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Default Alert</AlertTitle>
              <AlertDescription>
                This is a neutral informational alert.
              </AlertDescription>
            </Alert>
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your action was completed successfully.
              </AlertDescription>
            </Alert>
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Please be aware of this important information.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                There was an error processing your request.
              </AlertDescription>
            </Alert>
            <div className="pt-6">
              <h4 className="text-base font-semibold mb-2">Toasts (Sonner)</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => toast("A new event has occurred.")}
                >
                  Default
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.success("Project saved successfully.")}
                >
                  Success
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.error("Failed to upload file.")}
                >
                  Error
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.warning("Your session is about to expire.")
                  }
                >
                  Warning
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.info("A new version of the app is available.")
                  }
                >
                  Info
                </Button>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* PATTERNS */}
      <section className="space-y-8">
        <h2 className="pb-4 border-b">Patterns</h2>

        {/* States */}
        <article className="space-y-4">
          <h3>System States</h3>
          <div className="space-y-8 p-6 bg-card rounded-[var(--radius-container)] border">
            <div>
              <h4 className="text-base font-semibold mb-2">
                Loading State (Skeleton)
              </h4>
              <ProjectCardSkeleton />
            </div>
            <div>
              <h4 className="text-base font-semibold mb-2">Empty State</h4>
              <EmptyState
                icon={FolderOpen}
                title="No Items Found"
                description="There are no items to display here. Try adding one."
              />
            </div>
            <div>
              <h4 className="text-base font-semibold mb-2">Error State</h4>
              <ErrorState
                message="Failed to load data from the server."
                onRetry={() => toast.info("Retrying...")}
              />
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default StyleGuidePage;
