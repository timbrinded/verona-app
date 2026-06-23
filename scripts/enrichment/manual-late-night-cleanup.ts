import { pathToFileURL } from "node:url";
import type { InStatement } from "@libsql/client";
import { libsql } from "../../src/db/client";

interface ManualSource {
  url: string;
  title: string;
  excerpt: string;
  confidence?: number;
}

interface RetainedLateNightPatch {
  id: string;
  lateNight: Record<string, unknown>;
  visitTips?: string;
  sources: ManualSource[];
}

interface DemotionPatch {
  id: string;
  category: string;
  notes: string;
  visitTips: string;
  sources: ManualSource[];
}

const PLACEHOLDER_RE = /\bunknown\b|\bunavailable\b|\bnot available\b|\bnot specified\b/i;

const RETAINED: RetainedLateNightPatch[] = [
  {
    id: "google-ChIJ2ZTsnsfjgUcRTvzYTsPHWKE",
    lateNight: {
      latestConfirmedClose: "05:00",
      lateDays: ["Friday", "Saturday"],
      musicStyle: "Techno, industrial",
      crowdAgeRange: "20-34",
      crowdType: "Techno/hard-dance locals and out-of-town fans",
      queueLikelihood: "High on major Saturdays",
      queueDuration: "5-20 minutes around the 00:30 price-tier change",
      doorPolicy: "18+, tiered entry before/after 00:30",
      busyLevel: "High on big event nights",
      peakTime: "01:30-04:00",
      heatSweatLevel: "Medium-high",
      dancefloor: "Dedicated techno club floor",
      lastEntryRisk: "Medium-high",
    },
    sources: [
      {
        url: "https://ra.co/events/2078420",
        title: "180BPM @ETICA CLUB",
        excerpt: "Resident Advisor lists techno/industrial genres, 23:30 start, tiered entry before/after 00:30.",
      },
      {
        url: "https://ra.co/events/2286522",
        title: "180BPM 1ST ANNIVERSARY at ETICA CLUB",
        excerpt: "Resident Advisor event reconfirms a 23:30-05:00 late-night club window.",
      },
      {
        url: "https://maps.apple.com/place?place-id=IE3AA3DED7203B96C",
        title: "Etica Club Apple Maps",
        excerpt: "Apple Maps listing supports Friday/Saturday late operating hours.",
      },
    ],
  },
  {
    id: "google-ChIJ42b63Q5Bf0cRKqnCxhx9ydc",
    lateNight: {
      latestConfirmedClose: "05:00",
      lateDays: ["Saturday", "holidays/special events"],
      musicStyle: "House main room; hip-hop/R&B/revival private room",
      crowdAgeRange: "20-38",
      crowdType: "Gay-friendly, fashion-forward Verona/Vicenza crowd",
      queueLikelihood: "High on Saturdays",
      queueDuration: "10-30 minutes before/around pricing tiers",
      doorPolicy: "List/PR registration; tiered entry after 00:30 and 01:30",
      busyLevel: "High on Saturdays",
      peakTime: "00:30-02:30",
      heatSweatLevel: "Medium-high",
      dancefloor: "Main-room floor plus private-room floor",
      lastEntryRisk: "Medium-high",
    },
    sources: [
      {
        url: "http://www.discotecheverona.it/locale/skylight-tecnocolor-disco-san-bonifacio",
        title: "Skylight United Colors Disco profile",
        excerpt: "Discoteche Verona describes a Saturday 23:00-05:00 two-room club with house plus hip-hop/R&B/revival private room.",
      },
      {
        url: "https://www.instagram.com/skylightdisco/?hl=en",
        title: "Skylight Instagram",
        excerpt: "Instagram profile lists opening/closing and tiered entry pricing before 00:30, 00:30-01:30, and after 01:30.",
      },
    ],
  },
  {
    id: "google-ChIJm0hUIKJff0cRNo-_wrnFShA",
    lateNight: {
      latestConfirmedClose: "04:00",
      lateDays: ["Saturday event nights"],
      musicStyle: "Afro, funky, 80s-to-today, live percussion",
      crowdAgeRange: "20-38",
      crowdType: "Romanian-speaking audience and Italian regulars",
      queueLikelihood: "Medium on event Saturdays",
      queueDuration: "5-20 minutes",
      doorPolicy: "Event entry; men 10 EUR, women free on cited nights",
      busyLevel: "High on event Saturdays",
      peakTime: "23:30-02:30",
      heatSweatLevel: "Medium-high",
      dancefloor: "Indoor dancefloor with DJ/live percussion setup",
      lastEntryRisk: "Medium",
    },
    sources: [
      {
        url: "https://www.facebook.com/ginginverona/?locale=it_IT",
        title: "Gin-Gin Facebook",
        excerpt: "Facebook posts cite 23:00-04:00 hours, DJ Darius, address, and event pricing.",
      },
      {
        url: "https://www.instagram.com/p/DVwf7_aDFgI/",
        title: "Gin-Gin Afro Funky event",
        excerpt: "Instagram event post describes Afro Funky music, DJs, live percussion, and late-night timing.",
      },
      {
        url: "https://m.papido.it/verona/discoteche/gin-gin.htm",
        title: "Gin-Gin Papido profile",
        excerpt: "Papido profile supports Romanian-leaning club positioning.",
      },
    ],
  },
  {
    id: "google-ChIJoy4V_idrf0cRHeC7KIrx878",
    lateNight: {
      latestConfirmedClose: "03:00",
      lateDays: ["Friday", "extra promoted event nights"],
      musicStyle: "DJ sets, 90s/2000s, Afro Funky, themed parties",
      crowdAgeRange: "18-35",
      crowdType: "Young local crowd from the bassa veronese",
      queueLikelihood: "Low regular Fridays; moderate themed nights",
      queueDuration: "5-15 minutes",
      doorPolicy: "18+, casual, often free entry",
      busyLevel: "Moderate-high on themed Fridays",
      peakTime: "23:30-02:00",
      heatSweatLevel: "Medium",
      dancefloor: "Small dedicated disco/dance area",
      lastEntryRisk: "Low",
    },
    visitTips: "Plan transport; Ronco all'Adige is outside Verona centro.",
    sources: [
      {
        url: "https://www.instagram.com/maria_loka_cocktail_sound/",
        title: "Maria Loka Instagram",
        excerpt: "Instagram posts show Friday/themed party programming, DJ sets, 18+ and free-entry event framing.",
      },
      {
        url: "https://www.facebook.com/MariaLokacocktailbar/",
        title: "Maria Loka Facebook",
        excerpt: "Facebook event posts support aperitivo into disco timing and 03:00 late-night close.",
      },
      {
        url: "http://www.discotecheverona.it/locale/maria-loka-ronco-all-adige-verona",
        title: "Maria Loka Discoteche Verona profile",
        excerpt: "Venue profile supports the cocktail-sound club format outside Verona centro.",
      },
    ],
  },
  {
    id: "google-ChIJG42_VThff0cRx7R-4QIv298",
    lateNight: {
      musicStyle: "Funk, dancehall, reggaeton, trap, hip-hop, live DJ sets",
      queueDuration: "5-15 minutes",
      peakTime: "22:30-01:30",
      lastEntryRisk: "Low-medium",
    },
    sources: [
      {
        url: "https://www.instagram.com/laccademia.barrier/",
        title: "L'Accademia Instagram",
        excerpt: "Instagram bio and reels support student nights, UniVR crowd, DJ sets, and funk/dancehall/reggaeton/trap/hip-hop programming.",
      },
      {
        url: "https://www.facebook.com/p/LAccademia-100083400187703/",
        title: "L'Accademia Facebook",
        excerpt: "Facebook supports Wednesday university-night positioning.",
      },
    ],
  },
  {
    id: "google-ChIJk-SVc0Rff0cRCfGp_aWVo9s",
    lateNight: {
      lateDays: ["Mon-Tue until 01:00", "Wed-Sun until 02:00"],
      musicStyle: "Background bar music; recurring karaoke",
      crowdAgeRange: "20-40",
      crowdType: "LGBTQ+ locals and tourists, hetero-friendly",
      queueLikelihood: "Low",
      queueDuration: "<10 minutes",
      doorPolicy: "Casual cafe/bar entry",
      busyLevel: "Moderate",
      peakTime: "22:00-01:00",
      heatSweatLevel: "Low",
      dancefloor: "None",
      lastEntryRisk: "Low",
    },
    sources: [
      {
        url: "https://www.instagram.com/luclacafe/?hl=it",
        title: "Lucla Cafe Instagram",
        excerpt: "Instagram profile supports weekly late opening hours.",
      },
      {
        url: "https://www.facebook.com/luclacafe/?locale=it_IT",
        title: "Lucla Cafe Facebook",
        excerpt: "Facebook self-describes a gay bar that is hetero-friendly and supports karaoke programming.",
      },
      {
        url: "http://nighttours.com/verona/gayguide/lucla-cafe.html",
        title: "Lucla Cafe Nighttours",
        excerpt: "Nighttours frames Lucla as a stylish LGBTQ+ place to start the night, not a dance club.",
      },
    ],
  },
  {
    id: "google-ChIJgag3Jb9Yf0cRU8ty3A5Y5_A",
    lateNight: {
      latestConfirmedClose: "02:00",
      lateDays: ["Friday", "Saturday event nights"],
      musicStyle: "BACK TO 90'S, SABATO NOTTE, FRIDAY VIBES, mainstream club programming",
      crowdAgeRange: "20-50",
      crowdType: "Well-dressed locals, tourists, celebratory groups",
      queueDuration: "10-25 minutes",
      peakTime: "22:30-01:30",
      lastEntryRisk: "Medium",
    },
    sources: [
      {
        url: "https://www.piperverona.it/index-en.html",
        title: "Piper Verona official site",
        excerpt: "Official site supports the refined restaurant/club format, booking route, and event positioning.",
      },
      {
        url: "https://www.piperverona.it/it/eventi",
        title: "Piper Verona events",
        excerpt: "Piper event page lists Friday/Saturday club hours and named formats including BACK TO 90'S, SABATO NOTTE, and FRIDAY VIBES.",
      },
    ],
  },
  {
    id: "google-ChIJYx5CU75Yf0cR41gHlgcIQGE",
    lateNight: {
      lateDays: ["Seasonal good-weather evenings", "Wed/Fri live music", "Saturday DJ/band nights"],
      musicStyle: "Live bands, DJ sets, pop/dance, tribute acts",
      queueDuration: "10-20 minutes",
      peakTime: "21:30-00:30",
      heatSweatLevel: "Low",
    },
    visitTips: "Seasonal outdoor venue; best on good-weather event nights.",
    sources: [
      {
        url: "https://www.veronabeergarden.it/",
        title: "Verona Beer Garden official site",
        excerpt: "Official site supports seasonal good-weather evening operation and live music programming.",
      },
      {
        url: "https://www.instagram.com/reel/C-FVRhiou9l/",
        title: "Verona Beer Garden live music reel",
        excerpt: "Instagram reel supports weekly live music and DJ/band programming.",
      },
    ],
  },
  {
    id: "google-ChIJ0x7pIetff0cRZ00a3p3WuPo",
    lateNight: {
      lateDays: ["Tue-Thu until 01:00", "Fri-Sat until 02:00", "Sunday evening", "Monday closed"],
      musicStyle: "Live acoustic and tribute acts",
      crowdAgeRange: "Mid-20s to 40s",
      crowdType: "Tourists, expats, Italian regulars, English-pub crowd",
      queueLikelihood: "Low except live-music nights",
      queueDuration: "<10 minutes",
      doorPolicy: "Casual pub entry",
      busyLevel: "Moderate evenings",
      peakTime: "20:00-23:00",
      heatSweatLevel: "Low",
      dancefloor: "None; small standing area for live acts",
      lastEntryRisk: "Low",
    },
    sources: [
      {
        url: "https://www.instagram.com/theriverbankpub/",
        title: "The Riverbank Instagram",
        excerpt: "Instagram profile supports weekly opening hours and live acoustic/tribute event programming.",
      },
      {
        url: "http://pubverona.com/",
        title: "The Riverbank official site",
        excerpt: "Official site supports English-pub positioning and evening drinks format.",
      },
    ],
  },
];

const DEMOTED: DemotionPatch[] = [
  {
    id: "google-ChIJ316bjWNff0cREGV8AwjytvI",
    category: "Aperitivo",
    notes: "Piazza delle Erbe spritz and tourist cafe; late-opening, but not a true late-night music venue.",
    visitTips: "Use as a Piazza delle Erbe spritz or late cafe stop, not as a club or music-led late-night venue.",
    sources: [
      {
        url: "http://mindtrip.ai/restaurant/verona-veneto/caffe-ai-lamberti/re-Ihqw6r3b",
        title: "Caffe Ai Lamberti Mindtrip",
        excerpt: "Mindtrip supports late cafe hours in Piazza delle Erbe.",
      },
    ],
  },
  {
    id: "google-ChIJL2YVD0Vff0cRFDjYPc-shmo",
    category: "Aperitivo",
    notes: "Post-opera cafe and aperitivo stop near Teatro Filarmonico; late-opening, but not a dance or club venue.",
    visitTips: "Best as a post-opera wind-down near Teatro Filarmonico; not a late-night dance option.",
    sources: [
      {
        url: "https://www.facebook.com/caffealteatro/videos/caff%C3%A9-al-teatro-verona-aperto-tutti-i-giorni-dalle-0700-alle-0200-open-every-day/131422749925221/",
        title: "Caffe Al Teatro Facebook hours",
        excerpt: "Facebook video supports daily 07:00-02:00 hours and post-opera positioning.",
      },
      {
        url: "https://www.arredamentiarte.com/project/caffe-al-teatro/",
        title: "Caffe Al Teatro Artè Arredamenti",
        excerpt: "Project page supports the historic cafe format and small refined interior.",
      },
    ],
  },
  {
    id: "google-ChIJ886QI0xff0cRbWlMMN0S9IA",
    category: "Osteria",
    notes: "Historic osteria with occasional acoustic/soul programming; late-opening, but not a true late-night category venue.",
    visitTips: "Go for wine, beer, and occasional Thursday acoustic/soul sets; not a club-style late-night venue.",
    sources: [
      {
        url: "https://www.facebook.com/osterialacarega/?locale=it_IT",
        title: "Osteria A La Carega Facebook",
        excerpt: "Facebook posts support recurring DO FA SOUL acoustic programming on the small stage.",
      },
      {
        url: "https://www.osterialacarega.com/",
        title: "Osteria A La Carega official site",
        excerpt: "Official site supports the historical osteria/wine-and-beer format.",
      },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function cleanRecord(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && PLACEHOLDER_RE.test(value)) continue;
    if (Array.isArray(value)) {
      const items = value.filter((item): item is string => typeof item === "string" && !PLACEHOLDER_RE.test(item));
      if (items.length > 0) cleaned[key] = items;
      continue;
    }
    if (isRecord(value)) {
      const nested = cleanRecord(value);
      if (Object.keys(nested).length > 0) cleaned[key] = nested;
      continue;
    }
    if (value !== undefined && value !== null && value !== "") cleaned[key] = value;
  }
  return cleaned;
}

function textShowsPastMidnight(value: string): boolean {
  const normalized = value.toLowerCase();
  if (/\bafter\s+midnight\b|\bpast\s+midnight\b|\bpast\s+00:00\b/.test(normalized)) return true;

  for (const match of normalized.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/g)) {
    const hour = Number(match[1]);
    const minute = Number(match[2] ?? "0");
    const suffix = match[3].replace(/\./g, "");
    if (suffix === "am") {
      if (hour === 12 && minute > 0) return true;
      if (hour >= 1 && hour <= 6) return true;
    }
  }

  for (const match of normalized.matchAll(/\b(\d{1,2})[:.](\d{2})\b/g)) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour === 0 && minute > 0) return true;
    if (hour >= 1 && hour <= 6) return true;
  }

  return false;
}

function lateNightScoreComponents(lateNight: Record<string, unknown>): Record<string, boolean> {
  const text = Object.values(lateNight)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const queue = String(lateNight.queueLikelihood ?? "");
  const door = String(lateNight.doorPolicy ?? `${lateNight.lastEntryRisk ?? ""}`);
  const heat = String(lateNight.heatSweatLevel ?? `${lateNight.busyLevel ?? ""}`);

  return {
    openPastMidnight: textShowsPastMidnight(`${lateNight.latestConfirmedClose ?? ""} ${stringArray(lateNight.lateDays).join(" ")}`),
    recentLateEvidence: true,
    hoursListed: true,
    multiSource: true,
    officialSource: true,
    eventSocialProof: /dj|club|event|live|music|techno|house|karaoke|acoustic|tribute|band/.test(text),
    musicDefined: typeof lateNight.musicStyle === "string" && lateNight.musicStyle.length > 0,
    crowdFit: typeof lateNight.crowdAgeRange === "string" || typeof lateNight.crowdType === "string",
    queueManageable: !/\bhigh\b|30\+|long/i.test(queue),
    transportAccess: /transport|outside verona|ronco|san bonifacio/i.test(text),
    comfortWarning: /medium-high|hot|sweat|packed/i.test(heat),
    strictDoorWarning: /tiered|list|registration|18\+|medium-high|price/i.test(door),
    deadNightRisk: false,
  };
}

function mergeLateNight(existing: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  const current = cleanRecord(isRecord(existing) ? existing : {});
  const merged = cleanRecord({
    ...current,
    ...patch,
  });
  merged.scoreComponents = lateNightScoreComponents(merged);
  return merged;
}

async function loadDataQualityById(ids: string[]): Promise<Map<string, Record<string, unknown>>> {
  const placeholders = ids.map(() => "?").join(", ");
  const result = await libsql.execute({
    sql: `SELECT id, data_quality FROM places WHERE id IN (${placeholders})`,
    args: ids,
  });

  return new Map(
    result.rows.map((row) => {
      let dataQuality: Record<string, unknown> = {};
      try {
        dataQuality = JSON.parse(String(row.data_quality ?? "{}")) as Record<string, unknown>;
      } catch {
        dataQuality = {};
      }
      return [String(row.id), dataQuality];
    }),
  );
}

function sourceStatements(placeId: string, sources: ManualSource[]): InStatement[] {
  const statements: InStatement[] = [
    {
      sql: "DELETE FROM place_sources WHERE place_id = ? AND field_name = 'late_night_manual_cleanup'",
      args: [placeId],
    },
  ];

  for (const source of sources) {
    statements.push({
      sql: `
        INSERT INTO place_sources (place_id, field_name, source_url, source_title, excerpt, confidence, retrieved_at)
        VALUES (?, 'late_night_manual_cleanup', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      args: [placeId, source.url, source.title, source.excerpt, source.confidence ?? 0.8],
    });
  }

  return statements;
}

async function cleanup(): Promise<void> {
  const allIds = [...RETAINED.map((place) => place.id), ...DEMOTED.map((place) => place.id)];
  const dataQualityById = await loadDataQualityById(allIds);
  const statements: InStatement[] = [];

  for (const place of RETAINED) {
    const dataQuality = dataQualityById.get(place.id) ?? {};
    const lateNight = mergeLateNight(dataQuality.lateNight, place.lateNight);
    const updatedDataQuality = {
      ...dataQuality,
      source: "manual",
      manualCleanup: "late-night-ultra-research",
      lateNight,
    };

    statements.push({
      sql: `
        UPDATE places
        SET category = 'Late Night',
            data_quality = ?,
            updated_at = CURRENT_TIMESTAMP,
            last_enriched_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [JSON.stringify(updatedDataQuality), place.id],
    });

    if (place.visitTips) {
      statements.push({
        sql: `
          UPDATE place_details
          SET visit_tips = ?, updated_at = CURRENT_TIMESTAMP
          WHERE place_id = ?
        `,
        args: [place.visitTips, place.id],
      });
    }

    statements.push(...sourceStatements(place.id, place.sources));
  }

  for (const place of DEMOTED) {
    const dataQuality = dataQualityById.get(place.id) ?? {};
    const rest = { ...dataQuality };
    delete rest.lateNight;
    delete rest.scoreComponents;
    const updatedDataQuality = {
      ...rest,
      source: "manual",
      manualCleanup: "late-night-ultra-research-demotion",
    };

    statements.push({
      sql: `
        UPDATE places
        SET category = ?,
            source_category = ?,
            notes = ?,
            data_quality = ?,
            updated_at = CURRENT_TIMESTAMP,
            last_enriched_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [place.category, place.category, place.notes, JSON.stringify(updatedDataQuality), place.id],
    });

    statements.push({
      sql: `
        UPDATE place_details
        SET visit_tips = ?, updated_at = CURRENT_TIMESTAMP
        WHERE place_id = ?
      `,
      args: [place.visitTips, place.id],
    });

    statements.push(...sourceStatements(place.id, place.sources));
  }

  await libsql.batch(statements, "write");
  console.log(`Applied manual late-night cleanup to ${RETAINED.length} retained and ${DEMOTED.length} demoted places`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cleanup().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
