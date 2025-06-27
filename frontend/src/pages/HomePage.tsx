import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FeatureCard from "@/components/FeatureCard";

const features = [
  {
    title: "Automatic Transcription",
    description:
      "Get accurate text transcripts from your audio recordings automatically.",
    icon: "🎤",
  },
  {
    title: "AI Summarization",
    description:
      "Quickly understand the main points with AI-powered summaries.",
    icon: "📝",
  },
  {
    title: "Action Item Extraction",
    description:
      "Identify and track actionable tasks and decisions from meetings.",
    icon: "✅",
  },
];

function HomePage() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Hero Section */}
      <section className="mt-16 w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Welcome to <span className="text-primary">Meeting Synthesis</span>
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Effortlessly transform your meeting recordings into concise summaries,
          actionable items, and key decisions. Focus on what matters, not
          note-taking.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/register">
            <Button size="lg">Create Account</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Already a user? Log In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mt-24 w-full">
        <h2 className="text-3xl font-bold mb-12">Key Features</h2>
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer Link */}
      <p className="text-center text-muted-foreground mt-20">
        Want to learn more?{" "}
        <Link to="/guide" className="text-primary hover:underline">
          Read our Guide
        </Link>{" "}
        or{" "}
        <Link to="/about" className="text-primary hover:underline">
          About Us
        </Link>
        .
      </p>
    </div>
  );
}

export default HomePage;
