export interface ScoreComponents {
  operatingStatus: boolean;
  recentReviews: boolean;
  websiteResponds: boolean;
  multiSource: boolean;
  phoneListed: boolean;
  hoursListed: boolean;
  michelinListed: boolean;
  authenticSentiment: boolean;
  ratingConsistency: boolean;
  priceQuality: boolean;
  undiscoveredGem: boolean;
  localCrowd: boolean;
  touristTrapLanguage: boolean;
  menuPhotosOutside: boolean;
  decliningRatings: boolean;
}

export interface MethodologyScore {
  confidence: number;
  vibe: number;
  components: ScoreComponents;
}

export interface LateNightScoreComponents {
  openPastMidnight: boolean;
  recentLateEvidence: boolean;
  hoursListed: boolean;
  multiSource: boolean;
  officialSource: boolean;
  eventSocialProof: boolean;
  musicDefined: boolean;
  crowdFit: boolean;
  queueManageable: boolean;
  transportAccess: boolean;
  comfortWarning: boolean;
  strictDoorWarning: boolean;
  deadNightRisk: boolean;
}

export interface LateNightMethodologyScore {
  confidence: number;
  vibe: number;
  components: LateNightScoreComponents;
}

const EMPTY_COMPONENTS: ScoreComponents = {
  operatingStatus: false,
  recentReviews: false,
  websiteResponds: false,
  multiSource: false,
  phoneListed: false,
  hoursListed: false,
  michelinListed: false,
  authenticSentiment: false,
  ratingConsistency: false,
  priceQuality: false,
  undiscoveredGem: false,
  localCrowd: false,
  touristTrapLanguage: false,
  menuPhotosOutside: false,
  decliningRatings: false,
};

const ALIASES: Record<keyof ScoreComponents, string[]> = {
  operatingStatus: ["operational", "operating", "open", "google confirms operational"],
  recentReviews: ["recent reviews", "last 90 days", "5+ reviews"],
  websiteResponds: ["website responds", "website success", "http success"],
  multiSource: ["multi-source", "multi source", "google + tripadvisor", "google and tripadvisor"],
  phoneListed: ["phone listed", "contact number", "phone"],
  hoursListed: ["hours listed", "opening hours", "hours"],
  michelinListed: ["michelin", "bib gourmand", "michelin plate"],
  authenticSentiment: ["authentic", "locals", "hidden gem", "local feeling"],
  ratingConsistency: ["rating consistency", "both rate 4.5", "google and tripadvisor 4.5"],
  priceQuality: ["price-quality", "price quality", "mid-price", "mid price"],
  undiscoveredGem: ["undiscovered", "under 500 reviews", "<500 reviews"],
  localCrowd: ["italian language", "local crowd", "italian reviews"],
  touristTrapLanguage: ["tourist trap", "overpriced", "avoid"],
  menuPhotosOutside: ["menu photos outside", "menu outside"],
  decliningRatings: ["declining", "trending down", "recent reviews trending down"],
};

const EMPTY_LATE_NIGHT_COMPONENTS: LateNightScoreComponents = {
  openPastMidnight: false,
  recentLateEvidence: false,
  hoursListed: false,
  multiSource: false,
  officialSource: false,
  eventSocialProof: false,
  musicDefined: false,
  crowdFit: false,
  queueManageable: false,
  transportAccess: false,
  comfortWarning: false,
  strictDoorWarning: false,
  deadNightRisk: false,
};

const LATE_NIGHT_ALIASES: Record<keyof LateNightScoreComponents, string[]> = {
  openPastMidnight: ["open past midnight", "after midnight", "past 00:00", "open late", "late closing"],
  recentLateEvidence: ["recent late evidence", "recent late-night", "recent posts", "recent reviews", "current events"],
  hoursListed: ["hours listed", "opening hours", "published hours", "hours"],
  multiSource: ["multi-source", "multi source", "multiple sources", "cross checked"],
  officialSource: ["official source", "official website", "google business", "venue website"],
  eventSocialProof: ["event proof", "social proof", "instagram", "promoter", "dj", "dice", "ra.co", "resident advisor", "event listing"],
  musicDefined: ["music defined", "music style", "genre", "dj", "live music", "music"],
  crowdFit: ["crowd fit", "good crowd", "age range", "locals", "student", "creative crowd"],
  queueManageable: ["manageable queue", "low queue", "short queue", "walk-in", "easy entry"],
  transportAccess: ["transport", "taxi", "night bus", "walkable", "central"],
  comfortWarning: ["hot", "sweaty", "packed", "poor ventilation", "comfort warning"],
  strictDoorWarning: ["strict door", "selective door", "door policy", "dress code", "last entry"],
  deadNightRisk: ["dead night", "quiet night", "empty", "weekday risk", "inconsistent"],
};

function normalizedKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .trim()
    .toLowerCase();
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y", "present", "found", "positive"].includes(normalized);
}

function setComponent(components: ScoreComponents, key: string, value: boolean): void {
  const normalized = normalizedKey(key);
  for (const [component, aliases] of Object.entries(ALIASES) as [keyof ScoreComponents, string[]][]) {
    if (normalized === normalizedKey(component) || aliases.some((alias) => normalized.includes(alias))) {
      components[component] = value;
      return;
    }
  }
}

function setLateNightComponent(components: LateNightScoreComponents, key: string, value: boolean): void {
  const normalized = normalizedKey(key);
  for (const [component, aliases] of Object.entries(LATE_NIGHT_ALIASES) as [
    keyof LateNightScoreComponents,
    string[],
  ][]) {
    if (normalized === normalizedKey(component) || aliases.some((alias) => normalized.includes(alias))) {
      components[component] = value;
      return;
    }
  }
}

export function parseScoreComponents(value: string): ScoreComponents {
  const components = { ...EMPTY_COMPONENTS };
  if (!value.trim()) return components;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [key, rawValue] of Object.entries(parsed)) {
        setComponent(components, key, booleanValue(rawValue));
      }
      return components;
    }
  } catch {
    // Fall through to delimiter parsing.
  }

  for (const token of value.split(/[;\n|,]/)) {
    const normalized = token.trim();
    if (!normalized) continue;

    const negative = /^(no|not|missing|without)\b/i.test(normalized);
    setComponent(components, normalized, !negative);
  }

  return components;
}

export function parseLateNightScoreComponents(value: string): LateNightScoreComponents {
  const components = { ...EMPTY_LATE_NIGHT_COMPONENTS };
  if (!value.trim()) return components;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [key, rawValue] of Object.entries(parsed)) {
        setLateNightComponent(components, key, booleanValue(rawValue));
      }
      return components;
    }
  } catch {
    // Fall through to delimiter parsing.
  }

  for (const token of value.split(/[;\n|,]/)) {
    const normalized = token.trim();
    if (!normalized) continue;

    const negative = /^(no|not|missing|without)\b/i.test(normalized);
    setLateNightComponent(components, normalized, !negative);
  }

  return components;
}

export function confidenceFromComponents(components: ScoreComponents): number {
  const score =
    (components.operatingStatus ? 40 : 0) +
    (components.recentReviews ? 25 : 0) +
    (components.websiteResponds ? 15 : 0) +
    (components.multiSource ? 10 : 0) +
    (components.phoneListed ? 5 : 0) +
    (components.hoursListed ? 5 : 0);

  return Math.min(1, Math.max(0, score / 100));
}

export function vibeFromComponents(components: ScoreComponents): number {
  const score =
    (components.michelinListed ? 10 : 0) +
    (components.authenticSentiment ? 5 : 0) +
    (components.ratingConsistency ? 3 : 0) +
    (components.priceQuality ? 2 : 0) +
    (components.undiscoveredGem ? 3 : 0) +
    (components.localCrowd ? 2 : 0) -
    (components.touristTrapLanguage ? 5 : 0) -
    (components.menuPhotosOutside ? 2 : 0) -
    (components.decliningRatings ? 3 : 0);

  return Math.min(20, Math.max(0, score));
}

export function methodologyScore(value: string): MethodologyScore {
  const components = parseScoreComponents(value);

  return {
    confidence: confidenceFromComponents(components),
    vibe: vibeFromComponents(components),
    components,
  };
}

export function lateNightConfidenceFromComponents(components: LateNightScoreComponents): number {
  const score =
    (components.openPastMidnight ? 35 : 0) +
    (components.recentLateEvidence ? 25 : 0) +
    (components.hoursListed ? 15 : 0) +
    (components.multiSource ? 15 : 0) +
    (components.officialSource ? 10 : 0);

  return Math.min(1, Math.max(0, score / 100));
}

export function lateNightVibeFromComponents(components: LateNightScoreComponents): number {
  const score =
    (components.eventSocialProof ? 4 : 0) +
    (components.musicDefined ? 4 : 0) +
    (components.crowdFit ? 3 : 0) +
    (components.queueManageable ? 2 : 0) +
    (components.transportAccess ? 2 : 0) +
    (components.openPastMidnight ? 2 : 0) +
    (components.recentLateEvidence ? 2 : 0) +
    (components.multiSource ? 1 : 0) -
    (components.comfortWarning ? 2 : 0) -
    (components.strictDoorWarning ? 2 : 0) -
    (components.deadNightRisk ? 3 : 0);

  return Math.min(20, Math.max(0, score));
}

export function lateNightMethodologyScore(value: string): LateNightMethodologyScore {
  const components = parseLateNightScoreComponents(value);

  return {
    confidence: lateNightConfidenceFromComponents(components),
    vibe: lateNightVibeFromComponents(components),
    components,
  };
}
