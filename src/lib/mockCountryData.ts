export type CountryInfo = {
  name: string;
  conflicts: { name: string; status: string; years: string; description: string }[];
  peaceInitiatives: { name: string; year: string; description: string }[];
  history: { year: string; event: string }[];
  stabilityScore: number;
  summary: string;
  leader?: { name: string; title: string; personality: string; politicalStance: string };
  relationships?: { allied: string[]; hostile: string[]; neutral: string[] };
  /** War, peace, crisis, sanctions, etc. */
  currentSituation?: string;
  /** How this country relates to the player / focal state in the sim */
  playerRelationship?: string;
};

const mockData: Record<string, CountryInfo> = {
  Ukraine: {
    name: "Ukraine",
    stabilityScore: 22,
    summary: "Ukraine has been embroiled in a full-scale war with Russia since February 2022, following years of tensions stemming from the 2014 Maidan Revolution and annexation of Crimea. The country is receiving significant Western military and financial support.",
    leader: { name: "Volodymyr Zelensky", title: "President", personality: "Resolute, charismatic, defiant", politicalStance: "Pro-Western, democratic reformist" },
    conflicts: [
      { name: "Russo-Ukrainian War", status: "active", years: "2022-present", description: "Full-scale Russian invasion following years of Donbas conflict, causing massive displacement and destruction." },
      { name: "Donbas Conflict", status: "active", years: "2014-present", description: "Ongoing separatist conflict in eastern Ukraine supported by Russia." },
    ],
    peaceInitiatives: [
      { name: "Istanbul Peace Talks", year: "2022", description: "Early ceasefire negotiations that collapsed amid continued hostilities." },
      { name: "Ukrainian Peace Formula", year: "2022", description: "10-point plan proposed by President Zelensky for restoring peace." },
    ],
    history: [
      { year: "1991", event: "Ukraine declares independence from the Soviet Union" },
      { year: "2004", event: "Orange Revolution brings pro-Western government to power" },
      { year: "2014", event: "Maidan Revolution; Russia annexes Crimea" },
      { year: "2022", event: "Russia launches full-scale invasion" },
    ],
    relationships: { allied: ["United States", "United Kingdom", "Poland", "Germany"], hostile: ["Russia", "Belarus"], neutral: ["China", "India", "Turkey"] },
  },
  Sudan: {
    name: "Sudan",
    stabilityScore: 18,
    summary: "Sudan has experienced severe political instability since the 2019 coup against Omar al-Bashir. The 2023 conflict between the Sudanese Armed Forces and the Rapid Support Forces has created one of the world's worst humanitarian crises.",
    leader: { name: "Abdel Fattah al-Burhan", title: "General / De Facto Leader", personality: "Military hardliner, authoritarian", politicalStance: "Military nationalist" },
    conflicts: [
      { name: "SAF-RSF Civil War", status: "active", years: "2023-present", description: "Conflict between Sudanese Armed Forces and Rapid Support Forces causing massive civilian casualties." },
      { name: "Darfur Crisis", status: "active", years: "2003-present", description: "Ongoing ethnic conflict with renewed violence since 2023." },
    ],
    peaceInitiatives: [
      { name: "Jeddah Agreement", year: "2023", description: "Short-lived ceasefire mediated by Saudi Arabia and the US." },
      { name: "IGAD Peace Process", year: "2023", description: "Regional peace initiative by East African nations." },
    ],
    history: [
      { year: "2011", event: "South Sudan secedes following referendum" },
      { year: "2019", event: "Coup removes long-serving President al-Bashir" },
      { year: "2021", event: "Military coup derails democratic transition" },
      { year: "2023", event: "War erupts between SAF and RSF" },
    ],
    relationships: { allied: ["Egypt", "Saudi Arabia", "UAE"], hostile: [], neutral: ["United States", "China", "Ethiopia"] },
  },
  Myanmar: {
    name: "Myanmar",
    stabilityScore: 15,
    summary: "Myanmar descended into civil war following the February 2021 military coup that overthrew the elected government. The military junta faces widespread armed resistance from ethnic armed organizations and the People's Defence Force.",
    leader: { name: "Min Aung Hlaing", title: "Commander-in-Chief / PM", personality: "Ruthless, isolationist, authoritarian", politicalStance: "Military nationalist, anti-democratic" },
    conflicts: [
      { name: "Civil War (Post-Coup)", status: "active", years: "2021-present", description: "Military junta vs. broad coalition of resistance forces following 2021 coup." },
      { name: "Rohingya Crisis", status: "active", years: "2017-present", description: "Military campaign against Rohingya Muslims causing mass exodus to Bangladesh." },
    ],
    peaceInitiatives: [
      { name: "ASEAN Five-Point Consensus", year: "2021", description: "Regional peace plan rejected by military junta." },
      { name: "NUG Negotiations", year: "2021", description: "Attempts by National Unity Government to unify resistance forces." },
    ],
    history: [
      { year: "1948", event: "Independence from British rule" },
      { year: "1962", event: "Military coup establishes decades of junta rule" },
      { year: "2015", event: "NLD wins landslide election; democratic transition begins" },
      { year: "2021", event: "Military coup overthrows elected government" },
    ],
    relationships: { allied: ["China", "Russia", "Thailand"], hostile: [], neutral: ["India", "Japan", "ASEAN countries"] },
  },
  "United States": {
    name: "United States",
    stabilityScore: 72,
    summary: "The United States remains the world's leading military and economic power, though facing domestic political polarization. It leads NATO alliances and maintains global security commitments across multiple regions.",
    leader: { name: "Joe Biden", title: "President", personality: "Experienced, diplomatic, multilateralist", politicalStance: "Liberal democratic, pro-multilateral institutions" },
    conflicts: [
      { name: "Global Counterterrorism Operations", status: "active", years: "2001-present", description: "Ongoing military operations against terrorist organizations worldwide." },
    ],
    peaceInitiatives: [
      { name: "NATO Alliance Leadership", year: "1949-present", description: "Leading NATO collective security alliance with 32 member nations." },
      { name: "Abraham Accords Mediation", year: "2020", description: "Brokered normalization agreements between Israel and Arab states." },
    ],
    history: [
      { year: "1945", event: "Emerges as global superpower after WWII" },
      { year: "1991", event: "Cold War ends; becomes sole superpower" },
      { year: "2001", event: "9/11 attacks lead to global War on Terror" },
      { year: "2022", event: "Leads Western support for Ukraine against Russian invasion" },
    ],
    relationships: { allied: ["United Kingdom", "Canada", "France", "Germany", "Japan", "Australia"], hostile: ["Russia", "North Korea", "Iran"], neutral: ["China", "India", "Saudi Arabia"] },
  },
  Russia: {
    name: "Russia",
    stabilityScore: 35,
    summary: "Russia is under international sanctions following its 2022 invasion of Ukraine and is increasingly isolated from Western nations. It maintains close ties with China and pursues a multipolar world order counter to Western institutions.",
    leader: { name: "Vladimir Putin", title: "President", personality: "Calculated, authoritarian, nationalist", politicalStance: "Russian nationalist, anti-Western, imperialist" },
    conflicts: [
      { name: "Russo-Ukrainian War", status: "active", years: "2022-present", description: "Full-scale invasion of Ukraine causing massive casualties and international condemnation." },
      { name: "Syria Military Intervention", status: "active", years: "2015-present", description: "Military support for Assad regime in Syrian civil war." },
    ],
    peaceInitiatives: [
      { name: "Minsk Agreements", year: "2014-2015", description: "Ceasefire agreements for Donbas conflict, largely unfulfilled." },
    ],
    history: [
      { year: "1991", event: "Soviet Union dissolves; Russian Federation established" },
      { year: "2008", event: "War with Georgia; recognition of South Ossetia and Abkhazia" },
      { year: "2014", event: "Annexes Crimea; backs Donbas separatists" },
      { year: "2022", event: "Launches full-scale invasion of Ukraine" },
    ],
    relationships: { allied: ["Belarus", "China", "Iran", "North Korea", "Syria"], hostile: ["United States", "Ukraine", "NATO members"], neutral: ["India", "Turkey", "Saudi Arabia"] },
  },
  China: {
    name: "China",
    stabilityScore: 58,
    summary: "China is the world's second-largest economy and growing military power, pursuing strategic competition with the United States. Its One China policy regarding Taiwan remains a major flashpoint, while Belt and Road Initiative expands its global influence.",
    leader: { name: "Xi Jinping", title: "President / General Secretary", personality: "Ambitious, calculated, authoritarian", politicalStance: "Communist nationalist, pro-multipolar order" },
    conflicts: [
      { name: "Taiwan Strait Tensions", status: "active", years: "1949-present", description: "Ongoing dispute over Taiwan's status with increased military provocations." },
      { name: "South China Sea Disputes", status: "active", years: "2009-present", description: "Territorial claims over disputed islands contested by multiple nations." },
    ],
    peaceInitiatives: [
      { name: "China-Brokered Saudi-Iran Deal", year: "2023", description: "Mediated normalization of Saudi-Iranian diplomatic relations." },
      { name: "Belt and Road Initiative", year: "2013-present", description: "Infrastructure investment program spanning 150+ countries." },
    ],
    history: [
      { year: "1949", event: "People's Republic of China established" },
      { year: "1978", event: "Deng Xiaoping begins economic reform era" },
      { year: "2001", event: "Joins World Trade Organization" },
      { year: "2013", event: "Xi Jinping consolidates power; launches BRI" },
    ],
    relationships: { allied: ["Russia", "Pakistan", "North Korea"], hostile: ["United States", "Taiwan", "Japan"], neutral: ["India", "European Union", "Southeast Asian nations"] },
  },
  India: {
    name: "India",
    stabilityScore: 62,
    summary: "India is the world's most populous democracy and largest economy by purchasing power parity. It maintains a strategic autonomy policy, participating in QUAD while maintaining ties with Russia and avoiding Western blocs.",
    leader: { name: "Narendra Modi", title: "Prime Minister", personality: "Nationalist, pragmatic, populist", politicalStance: "Hindu nationalist, economic reformist" },
    conflicts: [
      { name: "India-Pakistan Kashmir Dispute", status: "active", years: "1947-present", description: "Long-standing territorial dispute over Kashmir region with periodic military confrontations." },
      { name: "China Border Disputes", status: "frozen", years: "1962-present", description: "Ongoing border tensions including 2020 Galwan Valley clashes." },
    ],
    peaceInitiatives: [
      { name: "G20 Leadership", year: "2023", description: "Led G20 consensus on Ukraine statement and global development agenda." },
      { name: "SAARC Framework", year: "1985-present", description: "Regional cooperation organization for South Asian nations." },
    ],
    history: [
      { year: "1947", event: "Independence from Britain; partition creates Pakistan" },
      { year: "1962", event: "Border war with China" },
      { year: "1991", event: "Economic liberalization begins" },
      { year: "2023", event: "Becomes world's most populous nation" },
    ],
    relationships: { allied: ["United States", "France", "Israel"], hostile: ["Pakistan"], neutral: ["Russia", "China", "Saudi Arabia"] },
  },
};

export function getMockCountryInfo(countryName: string): CountryInfo {
  const exact = mockData[countryName];
  if (exact) return exact;

  const lower = countryName.toLowerCase();
  for (const [key, val] of Object.entries(mockData)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return { ...val, name: countryName };
    }
  }

  return {
    name: countryName,
    stabilityScore: 50,
    summary: `${countryName} is a sovereign nation with its own complex geopolitical dynamics. This briefing uses offline reference data while live analysis is unavailable.`,
    leader: { name: "Current Leader", title: "Head of State", personality: "Pragmatic, cautious", politicalStance: "Balancing domestic and regional priorities" },
    currentSituation: "Diplomatic engagement continues with mixed signals on trade and security.",
    playerRelationship: "Baseline diplomatic contact — relationship depends on your administration's next moves.",
    conflicts: [
      { name: "Internal Political Tensions", status: "frozen", years: "Recent", description: "Various internal and regional political challenges face the country." },
    ],
    peaceInitiatives: [
      { name: "UN Membership", year: "Post-independence", description: "Active member of the United Nations participating in multilateral diplomacy." },
    ],
    history: [
      { year: "20th century", event: "Modern state formation and independence" },
      { year: "Recent decades", event: "Integration into global economic and political systems" },
    ],
    relationships: {
      allied: ["Regional partners"],
      hostile: [],
      neutral: ["Neighboring states", "Major trading partners"],
    },
  };
}
