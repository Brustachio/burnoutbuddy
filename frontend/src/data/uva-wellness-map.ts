export interface WellnessRecommendation {
  location: string;
  description: string;
  suggestion: string;
}

export const WELLNESS_MAP: Record<string, WellnessRecommendation> = {
  stressed: {
    location: "The Dell",
    description: "A peaceful green space in the heart of Grounds",
    suggestion:
      "Take a 10-minute walk around The Dell to decompress before your next session.",
  },
  overwhelmed: {
    location: "Contemplative Sciences Center",
    description: "Meditation and mindfulness space near the Rotunda",
    suggestion:
      "Drop in for a guided breathing exercise \u2014 sessions run on the hour.",
  },
  behind: {
    location: "Alderman Library",
    description: "UVA\u2019s main study library with quiet floors",
    suggestion:
      "Grab a focused study spot on the 4th floor. Break your work into 25-minute chunks.",
  },
  "need-break": {
    location: "The Rotunda Lawn",
    description: "The iconic UVA lawn behind the Rotunda",
    suggestion:
      "Sit on the Lawn for 15 minutes. Fresh air and a change of scenery resets focus.",
  },
  great: {
    location: "Keep going!",
    description: "You\u2019re in a great flow state",
    suggestion:
      "Ride the momentum \u2014 start your next session when you\u2019re ready.",
  },
  focused: {
    location: "Your current spot",
    description: "If it\u2019s working, don\u2019t change it",
    suggestion:
      "Stay put and keep the streak going. Consider a short water break.",
  },
};

export const RECOMMENDATION_PRIORITY = [
  "stressed",
  "behind",
  "overwhelmed",
  "need-break",
  "focused",
  "great",
];
