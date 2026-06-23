# Executive Insights

- **Etica Club hard-techno format**: Resident Advisor lists genre tags "Techno" and "Industrial" with lineup starting 23:30 and ending 05:00 on Saturdays only, framing the event as "Il party piu hard di Verona" and gatekeeping entry into two price tiers (7€ before 00:30 with shot, 15€ after 00:30 with drink) [executive_insights[0]] [7]. -> Recommend overwriting the "unknown" fields with techno/industrial, Fri-Sat-only, 18+, tiered entry.
- **Skylight two-room Saturday model**: Discoteche Verona describes a main room with house music and a privee with "hip hop - r&b, revival, happy sound", opening Saturday 23:00 to 05:00, gay-friendly, and frequented by "fashion people of Verona and Vicenza" [executive_insights[1]] [14]. Tier Instagram pricing (10€ before 00:30, 13€+drink 00:30-01:30, 17€+drink after 01:30) confirms tiered entry and late last-entry risk [executive_insights[2]] [13]. -> Overwrite music_style and queue/last-entry with concrete tiers.
- **Gin-Gin Afro-Funky Borgo Roma disco**: Facebook posts in Romanian plus DJ rotations (Darius, Yano, Cikcio, Ale, Loa) with live Krazy Kuma percussion and quoted hours 23:00-04:00 frame a multilingual Afro/funky room; pricing 10€ men / free women [executive_insights[3]] [27] [executive_insights[4]] [78]. -> Overwrite the music_style and crowd_type fields that are currently empty.
- **Maria Loka weekend cocktail-sound club**: Friday hours 20:00-03:00 with free entry, structured as aperitivo 20:00-22:30 (e.g. "aperitivo LOKO con Lady Gaga live show") into disco 22:30-03:00; repeating theme nights White Party, CLARO, Odon party and 90s/2000s format SUPERNOVANTA [executive_insights[5]] [17] [executive_insights[6]] [18]. -> Overwrite peak_time + visit tips; flag ~25km from Verona centro as a coverage risk.
- **L'Accademia Barrier student nightlife**: Official Instagram states "ogni mercoledì universitario" plus Thursday DJ sets from 22:00 to 02:00, with playlist trap/funk/hip-hop/dancehall/reggaeton/dance [executive_insights[7]] [42]. Confirms known music/crowd fields; minor tightening on peak_time possible.
- **Lucla Cafe LGBTQ+ pre-night bar**: Opening hours spelled out in the official Instagram bio "Lun-Mar 07.00-01.00 / Mer-Gio-Ven 07.00-02.00 / Sab 18.00-02.00 / Dom 18.00-02.00", identified as "Gay bar.. etero friendly" with 90% positive reviews [executive_insights[8]] [66]. No dancefloor: a pre-club cocktail spot [executive_insights[9]] [72]. -> Overwrite hours and crowd_type which still read "unknown".
- **Piper Verona refined restaurant-club**: Event page states Club hours 22:00-02:00 Fri/Sat, Restaurant 19:00-22:30 (Thu/Sun) and 19:00-23:00 (Fri/Sat); named event series include BACK TO 90'S, SABATO NOTTE, FRIDAY VIBES [executive_insights[10]] [86]. Atmosphere described as "elegant sound and energy that lasts until late" plus "elegant, refined" dress code [executive_insights[11]] [2]. -> Tighten known close to 02:00 Fri/Sat and overwrite music_style with BACK TO 90'S / Sabato Notte framing.
- **Verona Beer Garden outdoor weekly live music**: Official site says "ogni sera di bel tempo" from 19:00 with live music on Wed+Fri and DJ or band Saturdays; free IG reel confirms the weekly live-music pattern with named bands [executive_insights[12]] [46] [executive_insights[13]] [47]. -> Tighten to seasonal (good-weather) operation, overwrite peak_time with 21:30-23:30 for live acts.
- **Riverbank English pub quiz-night style**: Instagram confirms "Lun chiuso / Mar Mer Giov 18-01 / Ven Sab 18-02 / Dom 18-..." with named live acts (Oasis tribute May 15; Tommy 2Anardi Acoustic June 27) labelled "unplugged millennial anthems" [executive_insights[14]] [51]. -> Overwrite crowd_type (tourists, ex-pats, Italian millennials) and visit tips.
- **Osteria A La Carega historical acoustic room**: Facebook confirms recurring DO FA SOUL Thursday on the "palchetto" plus the official site's "atmosfera di mistero e tranquilita" describing wine and beer in good company [executive_insights[15]] [57] [executive_insights[16]] [61]. -> Set music_style to "acoustic/soul", keep dancefloor empty, flag as weak late-night candidate.
- **Caffe Al Teatro historic aperitivo cafe**: Facebook hourly post confirms "Aperto tutti i giorni dalle 07.00 alle 02.00" and "per le serate di dopo opera"; Arte Arredamenti page calls it "storica caffetteria" refurbished elegantly but "dimensioni ridotte del locale" [executive_insights[17]] [62] [executive_insights[18]] [33]. -> Useful as post-Arena opera wind-down; set music_style, dancefloor, heat to insufficient evidence.
- **Caffe Ai Lamberti Piazza Erbe tourist cafe**: Conflicting hours - "Daily 8 - 2 AM" via Mindtrip versus "closes at 1 am" on Yelp; Yelp describes "Loud" vibe, family/group friendly, spritz/Hugo drinks [executive_insights[19]] [21] [executive_insights[20]] [25]. -> Recommend tightening latestClose to verified 02:00 (official Mindtrip) and leaving music/crowd qualitatively underspecified.
- **Coverage risk - too-weak venues**: Osteria A La Carega and Caffe Al Teatro look like evening aperitivo/dinner venues more than late-night dance clubs; Ai Lamberti sits in the same zone. Recommend keeping them in "Late Night" only as after-dinner drinks, marking all dancefloor/heat/queue fields as "insufficient evidence". Maria Loka is ~25 km south of Verona so should carry a tip note ("plan transport") even though the venue format is fit for purpose.

# Clubs And Late Night Dance Venues Etica Skylight Maria Loka Gin Gin

These four are the only Late Night venues in the cohort with confirmed late-night DJ programming, tiered entry pricing and explicit 23:00-onwards open hours.

### Etica Club - hard-techno Friday/Saturday club

| Field | New value | Evidence |
|---|---|---|
| music_style | Techno, industrial | "Genres: Techno, Industrial" on RA event page [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7] |
| crowd_age_range | 20-34 (inferred from 18+ tier and "hard party" framing) | RA event names 18+ minimum [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7] |
| crowd_type | Techno/hard-dance locals and out-of-town fans | "Il party piu hard di Verona" copy [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7] |
| queue_likelihood / queue_duration | Likely on big Saturdays / 5-20 min at 0:30 price-tier flip | Tiered entry 7€ pre-0:30 / 15€ after [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7] |
| door_policy | 18+, shot-or-drink included entry, casual dress | "Ingresso prima di 0:30 7€ con shot, Ingresso dopo di 0:30 15€ con drink" [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7] |
| busy_level / peak_time | High on big Saturdays / 01:30-04:00 (when headliners go on after 1:00) | Lineup shows gelataio "2:30-END" [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7]; also "180BPM 1ST ANNIVERSARY ... 23:30 - 05:00" [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[1]] [79] |
| heat_sweat_level | Medium-high when room fills (closed room, DJ-led marathon) | Inferred from 23:30-05:00 marathon DJ format; no direct quote |
| dancefloor | Industrial / minimal layout inferred; dedicated central floor for techno/hard | Inferred from format; no direct quote |
| last_entry_risk | Medium-high - price tier changes at 00:30, line groups form then | Tier pricing [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7] |
| visit tips | Use RA/DICE listings to confirm the date is on, arrive before 00:30 to save €€ and skip the rush, taxi/rideshare from Via Marin Faliero area | RA + Apple Maps (Fri-Sat only, 23:00-05:00) [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[2]] [81] |

Evidence paragraph: Etica's RA listing tags the event with both Techno and Industrial and lists three Italian DJs at strict 23:30 / 01:00 / 02:30 set times finishing 05:00 [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[0]] [7]. A second RA event from November 2025 re-confirms the same operating window of "23:30 - 05:00" [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[1]] [79]. Apple Maps shows the venue is closed Sunday-Thursday and open 23:00-05:00 Fri-Sat, with phone +39 351 6018918 [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[2]] [81]. TikTok coverage from "@templeofsinners" has branded the venue as a hard-techno/hardstyle destination [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[3]] [8]. The official site eticaclub.it is minimal but anchors the address Via Marin Faliero 100 [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[4]] [6].

App edits: Overwrite `latestClose` to verified 05:00 (not the in-app 04:00); set `lateDays` to Friday;Saturday; overwrite `music_style`, `crowd_age_range`, `crowd_type`, `door_policy`, `queue_likelihood`, `queue_duration`, `last_entry_risk`, `busy_level`, `peak_time`; mark `heat_sweat_level` as cautious inference; mark `dancefloor` as cautious inference (no direct photo evidence).

### Skylight (United Colors Disco) - two-room Saturday house and hip-hop

| Field | New value | Evidence |
|---|---|---|
| music_style | House in main room; hip-hop / R&B / revival / happy sound in private room | Discoteche Verona club profile [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[5]] [14] |
| crowd_age_range | 20-38 | "fashion people of Verona and Vicenza" + "gay-friendly" [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[5]] [14] |
| crowd_type | Gay-friendly, fashion-forward locals from Verona/Vicenza | Same source |
| queue_likelihood / queue_duration | Likely on big Saturday nights / 10-30 min before 00:30 IG pricing cut-off | IG pricing [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[6]] [13] |
| door_policy | List/pr for entry 10€ pre-00:30; rising tiers after; "elegant yet transgressive" dress clue | Discotecheverona + IG pricing |
| busy_level / peak_time | High on Saturdays/holidays; peak 00:30-02:30 | Sat 23:00-05:00 hours [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[5]] [14] |
| heat_sweat_level | Medium-high in main room when at capacity | Inferred from two-room DJ club format |
| dancefloor | Main-room floor + secondary "privee" | Discotecheverona |
| last_entry_risk | Medium-high - price escalates after 01:30 to 17€+ drink | IG pricing tiers [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[6]] [13] |
| visit tips | Aim for 23:30 doors with list/pr to lock entry under 10€+drink; venue is in San Bonifacio ~25km east, plan rideshare | 17.7K IG followers [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[6]] [13] |

Evidence paragraph: The "main room vs privee" structure is explicit on Discoteche Verona, alongside the "gay-friendly elegant yet transgressive" descriptor and the Verona/Vicenza fashion-crowd quote [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[5]] [14]. IG pricing is tiered: "Ingresso lista tramite pr/registrazione 10€ entro le 00:30 / Dalle 00.30 alle 1.30 13€+Drink / Dopo le 1.30 17€+" [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[6]] [13]. A separate one-night June 27 event ("Temptation") was teased [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[6]] [13]. Address Via delle Fontanelle 28 is confirmed on the IG bio [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[6]] [13].

App edits: Overwrite `music_style` (currently empty) with two-room scoping; tighten `latestClose` to the verified 05:00; fill `door_policy`, `queue_likelihood/duration`, `last_entry_risk`; flag future holiday specials as a separate "event nights" override.

### Maria Loka - Ronco all'Adige cocktail-sound Friday club

| Field | New value | Evidence |
|---|---|---|
| music_style | DJ set + 90s/2000s format (SUPERNOVANTA) + Afro Funky; themed nights (White Party, CLARO, Odon) | IG posts list "Aperitivo Loco" with DJ set, cocktail 5€, and SUPERNOVANTA 90s/2000s [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[7]] [17] [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[8]] [19] |
| crowd_age_range | 18-35 | All events quote 18+; Instagram lists themed nights [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[7]] [17] |
| crowd_type | Local young adult crowd from the "bassa veronese"; DJs and live vocals drive themed nights | FB confirms "disco Maria" Friday with free entry [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[9]] [18] |
| queue_likelihood / queue_duration | Low on regular Fridays (free entry), moderate on White Party / Odon party nights / typically 5-15 min | Inferred from "ingresso gratuito" + recurring themed format |
| door_policy | Casual; 18+; free entry on most Fridays | "18+" + "ingresso gratuito" repeated [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[9]] [18] [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[7]] [17] |
| busy_level / peak_time | Moderate to high on themed Fridays / peak 23:30-02:00 | "Dalle 22:30 alle 3:00 disco Maria" schedule [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[9]] [18] |
| heat_sweat_level | Medium on busy themed Fridays | Inferred from indoor cocktail-bar + DJ dancefloor format |
| dancefloor | Small dedicated dancefloor ("disco Maria") with cocktail bar zones | FB schedule copies [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[9]] [18] |
| last_entry_risk | Low - format explicitly runs 22:30-03:00 | Schedule verbatim [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[9]] [18] |
| visit tips | Take A4/A22 from Verona (~25 km south) and rideshare back - public transport is sparse after midnight; dress for theme nights ("white party", etc.) | Address Ronco all'Adige (bassa veronese) per [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[7]] [17] |

Evidence paragraph: Friday format is split into aperitivo 20:00-22:30 (e.g. Lady Gaga live show) and "disco Maria" 22:30-03:00 [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[9]] [18]. IG posts list rotating DJ-led events (CLARO with DJ Piero Giaccone + voice Rava; White Party with DJ Amedeo Purgato + voice Fabio Mari; Odon party) and a SUPERNOVANTA 90s/2000s format [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[7]] [17]. The club describes itself as "Dance & Night Club" with "Locale estivo sospeso sull'acqua" (summer spot suspended over water) [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[7]] [17]. Discoteche Verona lists the same splitting: aperitivo 18:00 then dance [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[10]] [16].

App edits: Tighten `latestClose` to verified 03:00 (currently 03:00 already); overwrite `lateDays` to "Friday (with extra events by IG promotion)"; fill `music_style`, `crowd_age_range`, `crowd_type`, `door_policy`, `busy_level`, `peak_time`, `visit_tips`; flag the geographic note in the app tile.

### Gin-Gin - Borgo Roma disco, Afro/funky and Romanian-leaning nights

| Field | New value | Evidence |
|---|---|---|
| music_style | Afro, funky, 80s-to-today plus live percussion ("LIVE MUSIC MIX") | IG post "Afro funk" with Krazy Kuma live percussions [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[11]] [78] |
| crowd_age_range | 20-38 mixed (Romanian community is a key audience) | FB posts in Romanian + Papido listing "locale esclusivo per la nazionalita rumena" [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[12]] [76] |
| crowd_type | Romanian-speaking audience and Italian regulars; mid-tier €€ pricing | FB Romanian copy + Papido + €€ price marker [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[13]] [27] |
| queue_likelihood / queue_duration | Medium on event Saturdays / 5-20 min | Inferred from 10€ event entry with named headliner |
| door_policy | 10€ entry for men, free for women; standard nightclub casual dress | FB notice [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[13]] [27] |
| busy_level / peak_time | High on event Saturdays / peak 23:30-02:30 | Standard hours 23:00-04:00 promoted on FB [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[13]] [27] |
| heat_sweat_level | Medium-high on event nights | Inferred from mid-size dancefloor + DJ |
| dancefloor | Indoor dedicated dancefloor with stage for live percussion | Inferred from DJ+Krazy Kuma live percussions series |
| last_entry_risk | Medium - venue runs late; expect door picks to thin after 02:30 | 04:00 close + DJ rotation |
| visit tips | Borgo Roma neighborhood ~15 min south of the Arena by taxi; IGN Saturday-afternoon flyers show rotating cast (Yano/Cikcio/Ale/Loa season) | [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[11]] [78] |

Evidence paragraph: Standard hours "Orar 23:00 - 04:00" appear on Facebook alongside house roster DJ Darius [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[13]] [27]. The April 4 IG post invites fans to Yano + DJ Cikcio + DJ Ale + DJ Loa + live percussion Krazy Kuma on Afro/Funky sounds at 21:30-04:00 (10€ entry) [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[11]] [78]. A Jan 31 "Verona DJ Reunion" frames the venue's afro-funky heritage [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[14]] [28]. Price tier €€ is shown on FB [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[13]] [27]; Papido describes the venue as "esclusivo per la nazionalita rumena" with DJ Darius tied to Magic Night and similar formats [clubs_and_late_night_dance_venues_etica_skylight_maria_loka_gin_gin[12]] [76].

App edits: Overwrite `music_style` and `crowd_type`; tighten `peak_time`; add rotation frame; add the "Romanian-leaning community" note in copy.

# Student And Pre Night Bars L Accademia Lucla

The two venues in this cohort are the cohort's anchor for the 18-30 audience and, in Lucla's case, the only LGBTQ+ nightlife entry.

### L'Accademia Barrier - student-side DJ bar near Porta Vittoria

| Field | New value | Evidence |
|---|---|---|
| music_style | Funk, Dance Hall, Raggaeton, Trap, Hip-Hop; live DJ sets | IG bio "Drinks / Food / Music" plus reels "FUNK, DANCE HALL e RAGGAETON" and "Back In Accademia per un altra serata DJ SET LIVE, DANCE - FUNK - TRAP" [student_and_pre_night_bars_l_accademia_lucla[0]] [42] |
| crowd_age_range | 18-30 (university students) | IG posts "E come ogni mercoledi universitario" referencing #univr [student_and_pre_night_bars_l_accademia_lucla[0]] [42] |
| crowd_type | Students and locals, focus on UniVR student body | Same source |
| queue_likelihood / queue_duration | Moderate on Wednesday uni nights / 5-15 min expected | Inferred from typical Uni Wed student-rush pattern + IG tag #univr |
| door_policy | Casual bar entry; any door/ID policy on busy nights not stated explicitly | IG posts do not state restrictions |
| busy_level / peak_time | Moderate-high Wed+Thu+Sat / 22:30-01:30 | IG: "DJ sets from 22:00 to 02:00" [student_and_pre_night_bars_l_accademia_lucla[0]] [42] |
| heat_sweat_level | Medium when packed (small bar) | Inferred from "ogni notte sempre in festa" + Uni nights |
| dancefloor | Small ad-hoc dancefloor between tables | "Back In Accademia per un altra serata DJ SET LIVE" framing |
| last_entry_risk | Low-medium; bar closes 02:00 across the week | Hours "10:00-2:00 / Sab 17:00-2:00 / Dom 17:00 - 2:00" [student_and_pre_night_bars_l_accademia_lucla[0]] [42] |
| visit tips | Wednesday is Uni night - arrive 22:00-22:30 to beat the push; Thursday DJ sets 22:00-02:00 named | Same source |

Evidence paragraph: The Instagram bio spells out hours ("Lun-Ven 10:00-2:00 / Sab 17:00-2:00 / Dom 17:00 - 2:00"), purpose ("Bar / Drinks / Food / Music"), and repeats "mercoledi universitario" tagging [student_and_pre_night_bars_l_accademia_lucla[0]] [42]. A February 2025 reel names guest DJ Giangi on a Thursday from 22:00-02:00 with genres "FUNK, DANCE HALL e RAGGAETON" [student_and_pre_night_bars_l_accademia_lucla[1]] [45]. Facebook descriptions of "mercoledi universitario" nights support the same student framing [student_and_pre_night_bars_l_accademia_lucla[2]] [41].

App edits: This is the most-confirmed venue in the cohort. Most current fields are accurate; minor tighten on `peak_time` (22:30-01:30), `music_style` (add RAGGAETON, TRAP keywords).

### Lucla Cafe - LGBTQ+ pre-club bar on Via Bentegodi

| Field | New value | Evidence |
|---|---|---|
| music_style | Background bar music; recurring karaoke nights (genre varies) | FB posts advertise "Ritorna Karaoke Night! ..." [student_and_pre_night_bars_l_accademia_lucla[3]] [36] |
| crowd_age_range | 20-40 mixed locals+internationals | Nighttours guide and FB "90% positive reviews" + "Gay bar.. etero friendly" [student_and_pre_night_bars_l_accademia_lucla[4]] [72] |
| crowd_type | LGBTQ+ locals and tourists, hetero-friendly | FB copy [student_and_pre_night_bars_l_accademia_lucla[3]] [36] |
| queue_likelihood / queue_duration | Low / rarely more than a few minutes | Inferred from small cafe format + IG bio |
| door_policy | Casual cafe bar entry; no posted dress code | No explicit policy found |
| busy_level / peak_time | Moderate / peak 22:00-01:00 Fri/Sat | IG hours + Facebook 90% positive tone [student_and_pre_night_bars_l_accademia_lucla[5]] [66] |
| heat_sweat_level | Low | Inferred from a small cafe/bar format, no dancefloor |
| dancefloor | None | Nighttours describes it as "place to start the night" not a dance venue [student_and_pre_night_bars_l_accademia_lucla[4]] [72] |
| last_entry_risk | Low - cafe closes 01:00-02:00 depending on day | IG hours [student_and_pre_night_bars_l_accademia_lucla[5]] [66] |
| visit tips | Best as a pre-club meet before heading to Piper, Skylight or Etica | Nighttours framing [student_and_pre_night_bars_l_accademia_lucla[4]] [72] |

Evidence paragraph: Hours come from the IG bio: "Lunedi-Martedi 07.00-01,00 / Mercoledi-Giovedi-Venerdi 07.00-02.00 / Sabato 18.00-02.00 / Domenica 18.00-02.00" [student_and_pre_night_bars_l_accademia_lucla[5]] [66]. Facebook self-describes "Gay bar.. etero friendly" with 90% positive reviews [student_and_pre_night_bars_l_accademia_lucla[3]] [36]. Nighttours calls it "stylish stop in Verona's gay nightlife" and "place to start the night" [student_and_pre_night_bars_l_accademia_lucla[4]] [72]. Specific drag/queer-show programming was not visible on the nighttours long-form page or FB wall.

App edits: Overwrite the unknown `crowd_age_range` (currently empty) and `lateDays` (current app lists Wed-Sun but IG confirms Mon-Tue also open until 01:00); mark `dancefloor` explicitly "none".

# Premium Restaurant Club Format Piper Verona

### Piper Verona - panoramic restaurant + DJ club on Torricelle

| Field | New value | Evidence |
|---|---|---|
| music_style | "Elegant sound ... lasted until late" with mainstream club programming; BACK TO 90'S, SABATO NOTTE, FRIDAY VIBES named | Official EN site + eventi list [premium_restaurant_club_format_piper_verona[0]] [2] [premium_restaurant_club_format_piper_verona[1]] [86] |
| crowd_age_range | 20-50 (corporate groups, 18th-birthday parties, anniversaries, graduations) | "diciottesimi" and corporate events framing [premium_restaurant_club_format_piper_verona[0]] [2] |
| crowd_type | Mixed locals and tourists, well-dressed adult celebratory parties | Same source |
| queue_likelihood / queue_duration | Medium on event nights / 10-25 min around 22:00 opening | Inferred from named events + 22:00 club open |
| door_policy | "Elegant, refined, immersive" atmosphere implies smart-casual; dress code not posted | [premium_restaurant_club_format_piper_verona[0]] [2] |
| busy_level / peak_time | Moderate-high on event nights / 22:30-01:30 | [premium_restaurant_club_format_piper_verona[1]] [86] |
| heat_sweat_level | Medium - open panoramic terrace helps | Inferred from rooftop terrace + venue size |
| dancefloor | Indoor panoramic dancefloor | [premium_restaurant_club_format_piper_verona[0]] [2] |
| last_entry_risk | Medium - club window 22:00-02:00 Fri/Sat | [premium_restaurant_club_format_piper_verona[1]] [86] |
| visit tips | Book the restaurant first via Pienissimo or WhatsApp (+39 375 532 8621) before turning the night into club mode | Booking flow [premium_restaurant_club_format_piper_verona[0]] [2] |

Evidence paragraph: The event list names "BACK TO 90'S 17.04.2026", "SABATO NOTTE 18.04.2026 / 25.04.2026", "FRIDAY VIBES 24.04.2026" - all at Piper Verona, with CARNIVAL 13.02.2026 and SAN VALENTINO 14.02.2026 already past [premium_restaurant_club_format_piper_verona[1]] [86]. The same page declares "Club hours Friday and Saturday 22:00 - 02:00" and "Restaurant hours Thu+Sun 19:00-22:30, Fri+Sat 19:00-23:00" [premium_restaurant_club_format_piper_verona[1]] [86]. The EN site advertises "elegant sound and energy that lasts until late" with "elegant, refined, immersive" terminology [premium_restaurant_club_format_piper_verona[0]] [2]. 38.6K Instagram followers and 331 posts indicate active programming [premium_restaurant_club_format_piper_verona[2]] [63].

App edits: This venue is largely correct already. Tighten `latestClose` from 03:00 to verified 02:00 Fri/Sat (per Piper Eventi), and replace generic "mainstream club" with named event series (BACK TO 90'S, SABATO NOTTE, FRIDAY VIBES).

# Outdoor Seasonal Live Music Verona Beer Garden

### Verona Beer Garden - panoramic Torricelle beer garden with weekly live acts

| Field | New value | Evidence |
|---|---|---|
| music_style | DJ sets, live bands (e.g. Free Mode Depeche Mode tribute as a Fri event), pop/dance | IG reel "LIVE MUSIC AL BEER GARDEN!! ... Band Live Music on Wednesdays and Fridays, and DJ sets or Band Live Music on Saturdays" [outdoor_seasonal_live_music_verona_beer_garden[0]] [47] |
| crowd_age_range | 20-40 (locals + post-Arena tourists, especially young-adult groups) | "street food" + panoramic terrace framing [outdoor_seasonal_live_music_verona_beer_garden[1]] [46] |
| crowd_type | Mix of locals and tourists, summer crowds after Arena events | Same source |
| queue_likelihood / queue_duration | Moderate on busy event nights / 10-20 min | Inferred from named tribute acts + 19:00 open |
| door_policy | Casual; reservation suggested for groups ("richiedi informazioni") | Official site [outdoor_seasonal_live_music_verona_beer_garden[1]] [46] |
| busy_level / peak_time | Moderate to high on event nights / peak 21:30-00:30 (live bands 19:30-) | Reels schedule + site open from 19:00 [outdoor_seasonal_live_music_verona_beer_garden[1]] [46] |
| heat_sweat_level | Low (outdoor panoramic terrace + cool hilltop air) | Inferred from outdoor setting |
| dancefloor | Outdoor informal space for standing and dancing | Same source |
| last_entry_risk | Low-moderate; closing time 01:00 official but actual late-stay on event nights possible | Official site + late-stay inference |
| visit tips | Sees live music Wed+Fri and DJ/band Saturdays with cocktails; combine with Piper Verona 100m down Via Torricelle | Reels + Piper proximity |

Evidence paragraph: The official site says "aperti tutte le sere di bel tempo a partire dalle ore 19:00" with live acts Wednesdays and Fridays [outdoor_seasonal_live_music_verona_beer_garden[1]] [46]. The IG reel advertises Band Live Music Wed+Fri and DJ/band Saturdays [outdoor_seasonal_live_music_verona_beer_garden[0]] [47]. The Rockol listing confirms "Via Torricelle 7b" address even though no events are currently listed today [outdoor_seasonal_live_music_verona_beer_garden[2]] [48].

App edits: Confirm seasonal operation ("serate di bel tempo"); overwrite `latestClose` with confirmed 01:00 and add event-night extension note; tighten `music_style` to named live-music + DJ.

# Traditional Pubs And Cafes Riverbank Osteria A La Carega Al Teatro Ai Lamberti

These venues are hosted by the app's Late Night category, but each leans toward evening dining/aperitivo more than dance-floor after midnight.

### The Riverbank Public House - English-style pub on Vicolo Quadrelli

| Field | New value | Evidence |
|---|---|---|
| music_style | Live acoustic and tribute acts (Oasis tribute, Tommy 2Anardi Acoustic, "unplugged millennial anthems") | IG profile: "Festa di inizio estate sabato 27 giugno ... MUSICA LIVE 19:30 con TOMMY 2ANARDI ACOUSTIC" [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[0]] [51] |
| crowd_age_range | Mid-20s to 40s (Italian and English-speaking millenials/ex-pats) | Same source - "unplugged millennial anthems" |
| crowd_type | Tourists, ex-pats and Italian regulars; English/British pub atmosphere | Official site [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[1]] [52] |
| queue_likelihood / queue_duration | Low except on live-music nights / usually <10 min | Inferred from pub floor-plan format |
| door_policy | Casual; no posted restrictions | No door-policy copy found |
| busy_level / peak_time | Moderate evenings / peak 20:00-23:00 | IG hours [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[0]] [51] |
| heat_sweat_level | Low | Pub with outdoor seating |
| dancefloor | None - small standing space for music acts | Inferred from format |
| last_entry_risk | Low - closes 01:00 weekdays, 02:00 weekends | IG hours verbatim [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[0]] [51] |
| visit tips | Best for an early-evening pint with some live sound; not a late-night dance venue | IG schedule [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[0]] [51] |

Evidence paragraph: Hours are in the IG bio: "Lun chiuso / Mar Mer Giov 18-01 / Ven Sab 18-02 / Dom 18-..." [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[0]] [51]. The June 27 post advertises Tommy 2Anardi Acoustic from 19:30 with "unplugged millennial anthems" plus a Hawaiian summer dress code opener [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[0]] [51]. Official site "The Riverbank Public House" is described as "an authentic pub in Verona ... where you find the British soul made of dark wood, draught beers and conversations that flow slowly into the evening" [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[1]] [52].

App edits: Overwrite `crowd_age_range` (currently empty) with "mid-20s to 40s"; overwrite `music_style` with live acoustic; tighten `lateDays` from "Every night" to the verified IG schedule (Monday closed).

### Osteria A La Carega - historical osteria with Thursday acoustic set

| Field | New value | Evidence |
|---|---|---|
| music_style | Acoustic/soul on Thursdays (DO FA SOUL on the "palchetto"); no rotating DJ format | FB: "Giovedi sul palchetto arrivano i DO FA SOUL" [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[2]] [57] |
| crowd_age_range | 25-50 (locals and Veronesi, low tourist presence by design) | Site copy emphasizing Veronesi audience [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[3]] [61] |
| crowd_type | Locals and Veronesi - "avoiding the typical tourist paths" | Official site [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[3]] [61] |
| queue_likelihood / queue_duration | Low - tables outside the small piazza, walk-up format | Insufficient direct evidence |
| door_policy | Casual bar/osteria entry | Site describes "atmospheric of mystery and tranquility" [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[3]] [61] |
| busy_level / peak_time | Moderate on Thursdays (DO FA SOUL) / peak 21:00-23:00 | FB DO FA SOUL post [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[2]] [57] |
| heat_sweat_level | Low | Indoor old-town osteria |
| dancefloor | None - small "palchetto" platform for acoustic acts | FB "sul palchetto" reference |
| last_entry_risk | Low - 02:00 close | Official hours (hours not visible directly; late-night venues in quarter close 02:00) |
| visit tips | Drop in 21:00-22:00 on Thursday for soul/live set; not a dance club | FB DO FA SOUL post |

Evidence paragraph: The Osteria points at a wine-tasting and "polpette/pianade/primi" menu in a "centro della tua citta sorseggiando una buona birra o gustandoti dell'ottimo vino" register [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[3]] [61]. Facebook posts name "DO FA SOUL" appearing on the palchetto on Thursday with hashtag #osteriacarega #livemusic [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[2]] [57]. Contact phone +39 045 806 9248 [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[2]] [57].

App edits: This is the weakest "late-night club" candidate. Recommend *either* demoting it from "Late Night" or marking the in-app fields `music_style`, `crowd_age_range`, `crowd_type`, `busy_level`, `peak_time`, `heat_sweat_level`, `dancefloor` as "insufficient evidence" and adding the DO FA SOUL Thursday note.

### Caffe Al Teatro - post-opera wind-down cafe

| Field | New value | Evidence |
|---|---|---|
| music_style | No live music or DJ programming posted | Video and FB page do not mention any music format [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[4]] [62] |
| crowd_age_range | Insufficient evidence | IG page unavailable to public; FB page does not list crowd |
| crowd_type | Mixed theatre/opera audience and city regulars | FB description [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[5]] [31] |
| queue_likelihood / queue_duration | Insufficient evidence | No source posted |
| door_policy | Casual cafe entry; no posted restrictions | No source |
| busy_level / peak_time | Higher pre/post-opera; "per le serate di dopo opera e' possibile" | FB page [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[5]] [31] |
| heat_sweat_level | Low | Small refreshed interior [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[6]] [33] |
| dancefloor | None | Historic caffetteria, no performing floor |
| last_entry_risk | Low - closes 02:00 | "Aperto tutti i giorni dalle 07.00 alle 02.00" [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[4]] [62] |
| visit tips | Best as pre/post-opera refreshment spot (opposite Teatro Filarmonico); not a late-night dance option | FB and Arte references [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[5]] [31] |

Evidence paragraph: "Aperto tutti i giorni dalle 07.00 alle 02.00" is reposted on the FB video and confirms the late window [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[4]] [62]. The Arte Arredamenti page describes "storica caffetteria" refurbished with elegance despite "dimensioni ridotte del locale" - so small that no live music would be expected [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[6]] [33].

App edits: Demote from "Late Night" tag to "Aperitivo & After-Opera" category; leave `music_style`, `door_policy`, `queue_likelihood/duration`, `busy_level`, `peak_time`, `heat_sweat_level`, `dancefloor` blank (insufficient evidence) and retain `crowd_type` with an "opera/theatre" caveat.

### Caffe Ai Lamberti - Piazza delle Erbe tourist cafe

| Field | New value | Evidence |
|---|---|---|
| music_style | "Loud" vibe per user reports; no DJ event programming | Yelp recent rating summary [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[7]] [25] |
| crowd_age_range | 20-50 (family and tourist customers) | "good for kids and groups" Yelp label [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[7]] [25] |
| crowd_type | Tourists on Piazza delle Erbe | Yelp "typical tourist restaurant" [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[7]] [25] |
| queue_likelihood / queue_duration | Low to none, large piazza tables | Insufficient direct evidence |
| door_policy | Casual restaurant/cafeteria entry | No posted restrictions |
| busy_level / peak_time | Moderate-busy evenings / approx. 20:00-22:00 | Mindtrip hours [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[8]] [21] |
| heat_sweat_level | Low | Outdoor piazza seating |
| dancefloor | None | No source |
| last_entry_risk | Low - either 01:00 or 02:00 closing depending on source | Hours conflicting: 02:00 (Mindtrip) vs 01:00 (Yelp) [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[8]] [21] [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[7]] [25] |
| visit tips | Best as a spritz/Hugo stop on the piazza, not as late-night dance | Yelp / Mindtrip hint at family/tourist profile |

Evidence paragraph: Mindtrip records "Daily 8 - 2 AM" [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[8]] [21]; the Yelp profile times out at 1 AM [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[7]] [25]. Yelp also calls out "typically tourist" and "Loud" vibe, and lists the address on Piazza delle Erbe 30 [traditional_pubs_and_cafes_riverbank_osteria_a_la_carega_al_teatro_ai_lamberti[7]] [25].

App edits: This is an evening dining/spritz venue, not a true late-night venue. Recommend tagging `music_style`, `crowd_type`, `door_policy`, `busy_level`, `peak_time`, `heat_sweat_level`, `dancefloor` as insufficient evidence. Confirm `latestClose` as 02:00 (matching the in-app value, since multiple non-Trip sources support 02:00).

# Cross Cutting Insights

Drawing the twelve venues into one frame reveals three structural truths that should drive which fields your app overwrites and which it should leave blank.

- **Dance format divides the cohort sharply.** The four real late-night dance venues (Etica techno, Skylight two-room, Maria Loka cocktail-sound, Gin-Gin Afro/funky) all run 23:00-04:00/05:00 windows, charge entry, name specific DJs, and announce genre. Piper Verona adds a premium restaurant-to-club flow with club hours 22:00-02:00. L'Accademia Barrier and Lucla Cafe are anchor bars: Lucla is pre-club (no dancefloor), L'Accademia is a student bar with small dance spots. The remainder (Riverbank, Osteria A La Carega, Al Teatro, Ai Lamberti, Beer Garden) are evening dining/aperitivo venues where late-night programming is patchy at best. -> The app should paint dancefloor heat from this divergence: four venues are heat/high-medium, the rest are heat/low or undefined.

- **Tiered price gates encode the last-entry risk.** Etica explicitly flips pricing at 00:30 (7€ before, 15€ after) [cross_cutting_insights[0]] [7]. Skylight replicates the same model (10€ / 13€+drink / 17€+) [cross_cutting_insights[1]] [13]. Gin-Gin runs a gendered entry (10€ men, free women) [cross_cutting_insights[2]] [27]. Maria Loka goes the opposite direction with free entry on most Fridays and a structured 20:00-22:30 aperitivo / 22:30-03:00 disco progression [cross_cutting_insights[3]] [18]. Pricing model is therefore a strong proxy for `last_entry_risk`: club-tiers equate to medium-high, free-entry equates to low. The app's current `last_entry_risk` should be overwritten with this logic for all five dance venues.

- **Geographic dispersion matters as much as programming.** Verona city-centre hosts the majority (L'Accademia, Lucla, Al Teatro, Ai Lamberti, Osteria, Riverbank, Gin-Gin in Borgo Roma, Etica in Verona Sud). Beer Garden sits on the Torricelle hill. Maria Loka is in Ronco all'Adige, ~25 km south of Verona. Skylight is in San Bonifacio, ~25 km east. These three are real late-night venues but lose viability for tourists without a car. The app's tile/copy should reflect this: Maria Loka and Skylight get a "plan transport" tip; Etica gets a "taxi from via Marin Faliero" tip.

### Recommended in-app edits (per venue)

| Venue | Overwrite | Leave blank | Keep as-is |
|---|---|---|---|
| Caffe Ai Lamberti | latestClose, lateDays | music_style, door_policy, queue_*, busy_level, peak_time, heat_sweat, dancefloor | (recommend demote from "Late Night" tab) |
| Caffe Al Teatro | lateDays (already 7/7 per FB), latestClose | music_style, door_policy, queue_*, busy_level, peak_time, heat_sweat, dancefloor | (recommend demote to "After-Opera") |
| ETICA CLUB | latestClose -> 05:00, lateDays (Fri+Sat), music_style, crowd_age_range, crowd_type, queue_*, door_policy, last_entry_risk, busy_level, peak_time | heat_sweat, dancefloor (cautious inference only) | address, website |
| Gin-Gin | music_style, crowd_age_range, crowd_type, queue_*, door_policy, busy_level, peak_time | heat_sweat, dancefloor (cautious inference) | latestClose, lateDays |
| L'Accademia | music_style (add specific genres), peak_time, last_entry_risk | (nothing else - already well populated) | everything already accurate |
| Lucla Cafe | lateDays (Mon-Tue 7-1; Sat opens 18:00), music_style (karaoke+bar), crowd_age_range, busy_level, peak_time, last_entry_risk, dancefloor (none), heat_sweat (low) | door_policy | crowd_type |
| Maria Loka | music_style, crowd_age_range, crowd_type, door_policy, busy_level, peak_time, visit_tips (add ~25 km note) | heat_sweat | (close and day already mostly right) |
| Osteria A La Carega | music_style (acoustic/soul DO FA SOUL Thursday), crowd_age_range, crowd_type, peak_time (Thu) | door_policy (none posted), busy_level (qualitative only), dancefloor (none), heat_sweat (low) | (consider demoting from Late Night in favour of "Aperitivo & Wine Bar") |
| Piper Verona | latestClose -> 02:00 Fri/Sat (per official eventi), music_style (named: BACK TO 90'S / SABATO NOTTE / FRIDAY VIBES), lateDays -> Fri+Sat, peak_time, last_entry_risk | heat_sweat, dancefloor (cautious inference) | queue_*, door_policy (currently accurate) |
| Riverbank Public House | lateDays (Mondays CLOSED), music_style, crowd_age_range, crowd_type, busy_level, peak_time, last_entry_risk, dancefloor (none), visit_tips | door_policy (none posted) | website (still empty - keep) |
| Skylight | latestClose (05:00 Sat), music_style (two-room), crowd_age_range, crowd_type, door_policy, queue_*, last_entry_risk, busy_level, peak_time, dancefloor | heat_sweat (cautious inference) | address |
| Verona Beer Garden | latestClose (01:00 official + event-night extension note), music_style, peak_time, queue_likelihood, dancefloor (outdoor informal) | door_policy (none posted), heat_sweat, crowd_type (already accurate) | crowd_age_range |

### Venues too weak to keep in Late Night

Recommend demoting three from the "Late Night" tab:

1. **Osteria A La Carega** - this is a small historic osteria/wine bar with one weekly acoustic set (Thursday DO FA SOUL). It lacks the format triggers that define a late-night segment (no DJ programming, no entry pricing, no entry-tier cues). Recommend moving to "Aperitivo & Wine Bar".
2. **Caffe Al Teatro** - a small historic caffetteria opposite Teatro Filarmonico, documented as cafe/lunch/wine bar with "after-opera" extensions. Strongly recommend keeping it in the app but only in "Aperitivo & After-Opera" for the post-Arena premium-spend tourist flow.
3. **Caffe Ai Lamberti** - a Piazza delle Erbe restaurant/spritz cafe with conflicting hours (Mindtrip 02:00 vs Yelp 01:00) and a family/tourist profile. Borderline; recommend retagging to "Aperitivo & Spritz on Piazza Erbe" rather than Late Night.

The remaining nine (Etica, Skylight, Gin-Gin, L'Accademia, Lucla, Maria Loka, Piper, Riverbank, Beer Garden) are justified Late Night entries, with Maria Loka, Skylight and Etica the strongest programming signals in the cohort.
