import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FeatureCard from "@/components/layout/FeatureCard";
import React from "react";
import log from "../services/logging";

const features = [
  {
    title: "Transcription",
    description: "Get accurate transcripts from your audio recordings.",
  },
  {
    title: "Summarization",
    description: "Quickly understand the main points of your meeting.",
  },
  {
    title: "Action Items",
    description: "Identify and track actionable tasks and decisions.",
  },
];

function HomePage() {
  log.info("HomePage rendered.");
  return (
    <div className="flex flex-col items-center text-center space-y-24">
      <section className="w-full">
        <h1>
          Welcome to <span className="text-primary">Meeting Synthesis</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto lead">
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

      <section id="features" className="w-full">
        <h2 className="mb-12">Key Features</h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </ul>
      </section>

      <p className="text-center text-muted-foreground">
        Want to learn more?{" "}
        <Link to="/guide" className="link">
          Read our Guide
        </Link>{" "}
        or{" "}
        <Link to="/about" className="link">
          About Us
        </Link>
        .
      </p>
    </div>
  );
}

export default HomePage;
