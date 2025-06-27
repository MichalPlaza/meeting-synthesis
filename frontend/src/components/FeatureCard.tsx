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
    <Card className="flex flex-col items-center text-center p-8 bg-card rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="text-5xl mb-6">{feature.icon}</div>
      <CardHeader className="p-0 mb-2">
        <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-muted-foreground">{feature.description}</p>
      </CardContent>
    </Card>
  );
}

export default FeatureCard;
