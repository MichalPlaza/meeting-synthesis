import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface FeatureCardProps {
  feature: Feature;
}

function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <Card className="flex flex-col items-center text-center p-6">
      {/* Optional: Icon or Image */}
      <div className="text-4xl mb-4">{feature.icon}</div>{" "}
      {/* Example using emoji as icon */}
      <CardTitle className="text-xl font-semibold mb-2">
        {feature.title}
      </CardTitle>
      <CardContent className="p-0">
        <p className="text-gray-600">{feature.description}</p>
      </CardContent>
    </Card>
  );
}

export default FeatureCard;
