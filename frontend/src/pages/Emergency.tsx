import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";

interface ResourceCardProps {
  title: string;
  detail?: string;
  location?: string;
  url?: string;
}

function ResourceCard({ title, detail, location, url }: ResourceCardProps) {
  return (
    <div className="rounded-md border border-border bg-card p-4 text-left">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {detail && (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      )}
      {location && (
        <p className="mt-1 text-xs text-muted-foreground/70">{location}</p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          Visit website →
        </a>
      )}
    </div>
  );
}

export default function Emergency() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center bg-background">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Take a breath.
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        It's okay to step away. Your wellbeing matters more than any deadline.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <ResourceCard
          title="UVA Counseling & Psychological Services (CAPS)"
          detail="(434) 243-5150 · After hours: press 7 for crisis support"
          location="Student Health Center, 400 Brandon Ave"
          url="https://www.studenthealth.virginia.edu/caps"
        />
        <ResourceCard
          title="Crisis Text Line"
          detail="Text HOME to 741741"
        />
        <ResourceCard
          title="UVA Student Health & Wellness"
          detail="(434) 924-5362 · 400 Brandon Ave"
          url="https://www.studenthealth.virginia.edu"
        />
        <ResourceCard
          title="988 Suicide & Crisis Lifeline"
          detail="Call or text 988, available 24/7"
          url="https://988lifeline.org"
        />
      </div>

      <Button
        onClick={() => navigate("/")}
        variant="outline"
        className="mt-10"
      >
        Return to BurnoutBuddy
      </Button>
    </div>
  );
}
