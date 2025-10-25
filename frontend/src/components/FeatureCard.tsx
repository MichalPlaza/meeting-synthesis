import React, { useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import log from "../services/logging";

interface Feature {
  title: string;
  description: string;
}

interface FeatureCardProps {
  feature: Feature;
}

// --- Helper Functions ---
function hslToRgb(h: number, s: number, l: number): number[] {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2,
    r = 0,
    g = 0,
    b = 0;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return [r, g, b];
}

function lerpColor(a: number[], b: number[], amount: number) {
  return a.map((c, i) => c + amount * (b[i] - c));
}

function FeatureCard({ feature }: FeatureCardProps) {
  log.debug("FeatureCard rendered for feature:", feature.title);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const randomParams = useMemo(() => {
    const baseHue = Math.random() * 360;
    const colorPalette = [...Array(4)].map((_, i) => {
      const hue = (baseHue + i * (Math.random() * 10 + 20)) % 360;
      return hslToRgb(hue, 100, 70);
    });
    const colorStops = [
      0,
      ...[...Array(2)].map(() => Math.random() * 0.6 + 0.2),
      1,
    ].sort();

    const heightmapGradients = [];
    for (let i = 0; i < 12; i++) {
      heightmapGradients.push({
        rotation: Math.random() * 360,
        translateX: (Math.random() - 0.5) * 300,
        translateY: (Math.random() - 0.5) * 300,
        scale: Math.random() * 0.8 + 0.5,
        opacity: Math.random() * 0.4 + 0.3,
      });
    }
    return { colorPalette, colorStops, heightmapGradients };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const { colorPalette, colorStops, heightmapGradients } = randomParams;
    const displaySize = 200;
    canvas.width = displaySize;
    canvas.height = displaySize;

    const heightmapCanvas = document.createElement("canvas");
    heightmapCanvas.width = displaySize;
    heightmapCanvas.height = displaySize;
    const heightmapCtx = heightmapCanvas.getContext("2d");
    if (!heightmapCtx) return;

    heightmapCtx.fillStyle = "black";
    heightmapCtx.fillRect(0, 0, displaySize, displaySize);
    heightmapCtx.globalCompositeOperation = "lighter";

    heightmapGradients.forEach((t) => {
      heightmapCtx.save();
      heightmapCtx.translate(t.translateX, t.translateY);
      heightmapCtx.rotate((t.rotation * Math.PI) / 180);
      heightmapCtx.scale(t.scale, t.scale);
      const gradient = heightmapCtx.createRadialGradient(
        displaySize / 2,
        displaySize / 2,
        0,
        displaySize / 2,
        displaySize / 2,
        displaySize
      );
      gradient.addColorStop(0, `rgba(255,255,255,${t.opacity})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      heightmapCtx.fillStyle = gradient;
      heightmapCtx.fillRect(0, 0, displaySize, displaySize);
      heightmapCtx.restore();
    });

    const heightmapData = heightmapCtx.getImageData(
      0,
      0,
      displaySize,
      displaySize
    ).data;
    const imageData = ctx.createImageData(displaySize, displaySize);

    for (let i = 0; i < heightmapData.length; i += 4) {
      const heightValue = heightmapData[i] / 255;
      let rgb;
      if (heightValue < colorStops[1])
        rgb = lerpColor(
          colorPalette[0],
          colorPalette[1],
          heightValue / colorStops[1]
        );
      else if (heightValue < colorStops[2])
        rgb = lerpColor(
          colorPalette[1],
          colorPalette[2],
          (heightValue - colorStops[1]) / (colorStops[2] - colorStops[1])
        );
      else
        rgb = lerpColor(
          colorPalette[2],
          colorPalette[3],
          (heightValue - colorStops[2]) / (colorStops[3] - colorStops[2])
        );

      const noise = (Math.random() - 0.5) * 15;
      imageData.data[i] = rgb[0] + noise;
      imageData.data[i + 1] = rgb[1] + noise;
      imageData.data[i + 2] = rgb[2] + noise;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, [randomParams]);

  return (
    <li className="list-none">
      <Card className="relative flex flex-col justify-center items-center text-center p-8 border-0 shadow-lg rounded-[var(--radius-container)] group overflow-hidden aspect-square">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out group-hover:scale-105"
        ></canvas>
        <div
          className="absolute inset-0 bg-black/10 backdrop-blur-sm" // <-- USUNIĘTO KLASY ANIMACJI
        ></div>

        <div className="relative z-10 text-white">
          <h3 className="text-2xl font-bold mb-3 drop-shadow-md">
            {feature.title}
          </h3>
          <CardContent className="p-0">
            <p className="text-white/80 drop-shadow-sm">
              {feature.description}
            </p>
          </CardContent>
        </div>
      </Card>
    </li>
  );
}

export default FeatureCard;
