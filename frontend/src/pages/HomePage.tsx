import { Link } from 'react-router-dom'; 
import { Button } from '@/components/ui/button';
import logo from "../assets/img/logo.png"
import FeatureCard from '@/components/FeatureCard';

const features = [
  { title: 'Automatic Transcription', description: 'Get accurate text transcripts from your audio recordings automatically.', icon: '🎤' },
  { title: 'AI Summarization', description: 'Quickly understand the main points with AI-powered summaries.', icon: '📝' },
  { title: 'Action Item Extraction', description: 'Identify and track actionable tasks and decisions from meetings.', icon: '✅' },
  // ... more features ...
];

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-4 text-center">
        

      <div className="flex items-center space-x-4 mb-8">
        <img src={logo} alt="App Logo" className="w-70 object-contain" />
        <h1 className="text-4xl md:text-5xl font-bold">
          Welcome to <span className="text-blue-600">Meeting Synthesis App</span>
        </h1>
      </div>

      <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl">
        Effortlessly transform your meeting recordings into concise summaries, actionable items, and key decisions. Focus on what matters, not note-taking.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
        <Link to="/register">        
           <Button size="lg" className="text-lg font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white">Get Started Free</Button>
        </Link>

        <Link to="/login">
            <Button size="lg" variant="outline" className="text-lg font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out bg-transparent hover:bg-gray-200 text-gray-800 border border-gray-400">Already a user? Log In</Button>
        </Link>
      </div>

      <div className="mt-16 w-full max-w-4xl mx-auto"> {/* Use mx-auto to center the max-w div */}
          <h3 className="text-2xl font-bold mb-6">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                  <FeatureCard key={index} feature={feature} />
              ))}
          </div>
      </div>

       <p className="text-center text-gray-600 mt-12">
           Want to learn more? <Link to="/guide" className="text-blue-600 hover:underline">Read our Guide</Link> or <Link to="/about" className="text-blue-600 hover:underline">About Us</Link>.
       </p>

    </div>
  );
}

export default HomePage;