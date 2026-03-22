import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";

interface ResourceCardProps {
  title: string;
  phone?: string;
  detail?: string;
  location?: string;
}

function ResourceCard({ title, phone, detail, location }: ResourceCardProps) {
  return (
    <div className="rounded-md border border-border bg-card p-4 text-left">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {phone && (
        <a
          href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
          className="mt-1 block text-sm text-primary hover:underline"
        >
          {phone}
        </a>
      )}
      {detail && (
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      )}
      {location && (
        <p className="mt-1 text-xs text-muted-foreground/70">{location}</p>
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
          phone="(434) 243-5150"
          detail="After hours: press 7 for crisis support"
          location="Student Health Center, 400 Brandon Ave"
        />
        <ResourceCard
          title="Crisis Text Line"
          detail="Text HOME to 741741"
        />
        <ResourceCard
          title="UVA Student Health & Wellness"
          phone="(434) 924-5362"
          location="400 Brandon Ave"
        />
        <ResourceCard
          title="988 Suicide & Crisis Lifeline"
          phone="988"
          detail="Call or text, 24/7"
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
