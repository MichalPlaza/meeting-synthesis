import { Button } from '@/components/ui/button';
import React from 'react';

function HomePage() {
  return (
    <div className="p-6"> {/* Ví dụ dùng Tailwind padding */}
      <h2 className="text-2xl font-semibold mb-4">Homepage</h2>
      <p>Welcome to the main page of your meeting synthesis app.</p>
      <div className="flex min-h-svh flex-col items-center justify-center">
        <Button>Click me</Button>
      </div>
    </div>
  );
}

export default HomePage;