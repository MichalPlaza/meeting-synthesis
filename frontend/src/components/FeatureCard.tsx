import React, { useMemo } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface Feature {
  title: string;
  description: string;
}

interface FeatureCardProps {
  feature: Feature;
}

// Helper function to generate a hyper-randomized multi-layer gradient
const generateRandomGradientStyle = () => {
  // 1. Generate 4 random base colors from the entire color wheel
  const cardPalette = [];
  for (let i = 0; i < 4; i++) {
    const hue = Math.floor(Math.random() * 360);
    // Use HSL for vibrant colors (high saturation, medium-high lightness)
    const lightness = Math.floor(Math.random() * 20) + 60;
    const saturation = Math.floor(Math.random() * 20) + 70;
    cardPalette.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }

  // 2. Create 20 gradient layers
  const gradients = [];
  for (let i = 0; i < 50; i++) {
    // 3. For each layer, pick a random color from the card's 4-color palette
    const randomColor =
      cardPalette[Math.floor(Math.random() * cardPalette.length)];

    // Random position
    const x = Math.floor(Math.random() * 150) - 25;
    const y = Math.floor(Math.random() * 150) - 25;

    // Random size
    const size = Math.floor(Math.random() * 50) + 50; // 30% to 90%5

    gradients.push(
      `radial-gradient(circle at ${x}% ${y}%, ${randomColor}, transparent ${size}%)`
    );
  }

  return { backgroundImage: gradients.join(", ") };
};

function FeatureCard({ feature }: FeatureCardProps) {
  const gradientStyle = useMemo(() => generateRandomGradientStyle(), []);

  return (
    <Card
      className="relative flex flex-col justify-center items-center text-center p-8 border-0 rounded-lg shadow hover:shadow-2xl transition-all duration-300 min-h-[280px]"
      style={gradientStyle}
    >
      <div className="relative z-10 text-foreground">
        <CardTitle className="text-2xl font-bold mb-3 drop-shadow-sm">
          {feature.title}
        </CardTitle>
        <CardContent className="p-0">
          <p className="text-foreground/80 drop-shadow-sm">
            {feature.description}
          </p>
        </CardContent>
      </div>
    </Card>
  );
}

export default FeatureCard;
