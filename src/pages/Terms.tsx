import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="w-4 h-4" /> Back home
      </Link>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Terms of Service</h1>
      <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-4">
        <p>Last updated: March 22, 2026</p>
        <h2 className="text-foreground text-lg font-medium">1. Acceptance of Terms</h2>
        <p>By accessing or using eva, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.</p>
        <h2 className="text-foreground text-lg font-medium">2. Description of Service</h2>
        <p>eva provides AI-powered financial insights and advisory tools. The service is for informational purposes only and does not constitute financial advice.</p>
        <h2 className="text-foreground text-lg font-medium">3. User Responsibilities</h2>
        <p>You are responsible for the information you enter and for how you use any generated insights.</p>
        <h2 className="text-foreground text-lg font-medium">4. Limitation of Liability</h2>
        <p>eva is provided "as is" without warranties. We are not liable for financial decisions made based on the service's output.</p>
      </div>
    </div>
  );
}
