import { GoogleGenAI, Type } from "@google/genai";
import { StanceCard } from '../types';

// Initialize Gemini API client
// Note: process.env.API_KEY is assumed to be available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// In-memory cache for generated portraits to avoid regeneration during the session
const portraitCache: Record<string, string> = {};

const SYSTEM_INSTRUCTION = `
You are the backend logic for "Candidate Chemistry," a swipe-based policy matching app. Your job is to extract specific, verified policy stances from candidates and present them anonymously.

Operational Rules:
1. ANONYMITY: Always present the "Stance Card" without the candidate's name or party.
2. VETTING: Only include stances that are backed by voting records or official platform filings.
3. FORMAT: Output MUST be valid JSON.
4. LINGUISTIC STYLE: Use "Question" format for the card (e.g., "Should we tax robotaxis to fund the Muni?").
5. DATA: Generate dummy/simulated profiles if real-time data is restricted, but try to base it on real San Francisco political context.
6. ANALYSIS: Provide an "analysis" field that explains the policy nuance in simple, standard, clear English (ELI5 style). Do NOT use jargon, slang, or simulated glitches. Ensure the text is grammatically correct and coherent.
7. GENDER: Infer the candidate's gender ('male' | 'female') for voice synthesis purposes.
`;

const PROMPT_CONTEXT = `
Theme: San Francisco 2026 Election - Housing, Public Safety, & Urban Design
Data Source: Latest Board of Supervisors voting records, Mayoral candidate platforms, and 2024-2025 Ballot Measures.

TASK:
Generate 8 Stance Cards. Each card must represent a controversial "wedge issue" where candidates strongly disagree.
Focus on:
1. Housing (Rent control, Upzoning)
2. Public Safety (Encampment sweeps, Police funding, Drug testing for welfare)
3. Transportation (Great Highway closure, Slow streets)
4. Economy (Downtown tax breaks, Office conversions)

Ensure the 'candidate_matches' list includes at least 3 local SF candidates (use real names if known, or plausible dummy names like 'Senator A. Smith' if precise real-time data is unavailable, but prioritize realism).
Include a 'party', short 'bio', and 'gender' ('male' | 'female') for each candidate to create a complete profile.
`;

export const fetchStanceCards = async (): Promise<StanceCard[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: PROMPT_CONTEXT,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stance_id: { type: Type.STRING },
              question: { type: Type.STRING },
              context: { type: Type.STRING },
              analysis: { type: Type.STRING },
              candidate_matches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    alignment: { type: Type.STRING, enum: ['supports', 'opposes'] },
                    source_link: { type: Type.STRING },
                    party: { type: Type.STRING },
                    bio: { type: Type.STRING },
                    gender: { type: Type.STRING, enum: ['male', 'female'] },
                  },
                  required: ['name', 'alignment', 'source_link', 'gender'],
                },
              },
            },
            required: ['stance_id', 'question', 'context', 'candidate_matches', 'analysis'],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data as StanceCard[];
    }
    
    throw new Error("No data returned from Gemini");
  } catch (error) {
    console.error("Error fetching stance cards:", error);
    // Return a fallback or empty array so the app doesn't crash, 
    // but in a real app we might want to propagate the error to the UI.
    // For this demo, let's return a safe fallback to demonstrate UI if API fails (e.g. invalid key).
    return FALLBACK_DATA;
  }
};

export const generateCandidatePortrait = async (name: string, gender: string, party: string): Promise<string | null> => {
  // Check cache first
  if (portraitCache[name]) {
    return portraitCache[name];
  }

  try {
    // Construct a descriptive prompt for the image model
    const prompt = `A high-quality, photorealistic professional headshot of a politician named ${name}, gender: ${gender}, party: ${party}. Neutral studio background, soft lighting, 4k resolution, detailed skin texture, confident expression.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Iterate through parts to find the image data
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64Data = part.inlineData.data;
          const fullDataUrl = `data:image/png;base64,${base64Data}`;
          
          // Cache the result
          portraitCache[name] = fullDataUrl;
          
          return fullDataUrl;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error generating candidate portrait:", error);
    return null;
  }
};

// Fallback data in case of API failure (e.g., missing key in demo environment)
const FALLBACK_DATA: StanceCard[] = [
  {
    stance_id: "fb-1",
    question: "Should rent control be expanded to buildings constructed after 1979?",
    context: "Current state law (Costa-Hawkins) limits rent control to older buildings. Some propose repealing this to combat the housing crisis.",
    analysis: "Imagine if the price of your favorite ice cream could never go up, no matter what. That's rent control. Right now, it only applies to old buildings. This policy asks: should we apply that rule to new buildings too? It might help people afford homes, but builders might stop building if they can't charge enough.",
    candidate_matches: [
      { name: "Aaron Peskin", alignment: "supports", source_link: "https://example.com/vote1", party: "Progressive", bio: "President of the Board of Supervisors, focused on tenant protections.", gender: 'male' },
      { name: "London Breed", alignment: "opposes", source_link: "https://example.com/vote2", party: "Moderate", bio: "Current Mayor, focuses on building more housing supply.", gender: 'female' },
      { name: "Daniel Lurie", alignment: "opposes", source_link: "https://example.com/vote3", party: "Moderate", bio: "Non-profit founder and heir to Levi Strauss fortune.", gender: 'male' }
    ]
  },
  {
    stance_id: "fb-2",
    question: "Should the city upzone single-family neighborhoods to allow 4-plexes everywhere?",
    context: "San Francisco's west side is largely low-density. Upzoning could increase supply but change neighborhood character.",
    analysis: "Think of a neighborhood with only big houses for one family. This rule would let people tear down one big house and build a mini-apartment for 4 families instead. It means more people can live there, but the neighborhood might look different and be more crowded.",
    candidate_matches: [
      { name: "Scott Wiener (State)", alignment: "supports", source_link: "https://example.com/vote4", party: "Democrat", bio: "State Senator pushing for aggressive housing mandates.", gender: 'male' },
      { name: "Ahsha Safaí", alignment: "supports", source_link: "https://example.com/vote5", party: "Moderate", bio: "Supervisor representing working-class districts.", gender: 'male' },
      { name: "Connie Chan", alignment: "opposes", source_link: "https://example.com/vote6", party: "Progressive", bio: "Supervisor focused on affordable housing over market rate.", gender: 'female' }
    ]
  },
  {
    stance_id: "fb-3",
    question: "Should welfare recipients be required to undergo drug screening to receive cash assistance?",
    context: "Proposition F (2024) introduced this requirement. Supporters argue it incentivizes treatment; opponents say it increases homelessness.",
    analysis: "This rule says if you want money from the city to help pay for food or rent, you have to prove you aren't using illegal drugs. If you are, you have to go to a doctor for help. Some say this saves lives; others say it just takes money away from poor people.",
    candidate_matches: [
      { name: "London Breed", alignment: "supports", source_link: "https://example.com/vote7", party: "Moderate", bio: "Current Mayor, pushed heavily for Prop F to combat the fentanyl crisis.", gender: 'female' },
      { name: "Dean Preston", alignment: "opposes", source_link: "https://example.com/vote8", party: "Democratic Socialist", bio: "Supervisor who argues this policy is punitive and ineffective.", gender: 'male' },
      { name: "Mark Farrell", alignment: "supports", source_link: "https://example.com/vote9", party: "Moderate", bio: "Former Interim Mayor running on a 'clean up the streets' platform.", gender: 'male' }
    ]
  },
  {
    stance_id: "fb-4",
    question: "Should the Great Highway be permanently closed to cars to create an oceanfront park?",
    context: "The highway was closed during the pandemic and became a popular promenade. A ballot measure seeks to make it permanent.",
    analysis: "There is a road right next to the ocean. During COVID, they closed it so people could walk and bike. Now, they want to keep it closed forever. People who walk love it, but people who drive say it makes traffic terrible on other streets.",
    candidate_matches: [
      { name: "Joel Engardio", alignment: "supports", source_link: "https://example.com/vote10", party: "Moderate", bio: "Supervisor representing the Sunset, advocating for the park.", gender: 'male' },
      { name: "Ahsha Safaí", alignment: "opposes", source_link: "https://example.com/vote11", party: "Moderate", bio: "Argues closing it hurts working-class commuters.", gender: 'male' },
      { name: "Myrna Melgar", alignment: "supports", source_link: "https://example.com/vote12", party: "Progressive", bio: "Supports the park as a climate resilience measure.", gender: 'female' }
    ]
  },
  {
    stance_id: "fb-5",
    question: "Should the police department be guaranteed minimum staffing levels regardless of the budget deficit?",
    context: "Proposition B aimed to mandate staffing levels. Critics argue it ties the hands of budget officials during deficits.",
    analysis: "Imagine if a school had to hire 100 teachers even if they didn't have enough money for books. This rule says the police MUST hire a certain number of officers, no matter how much money the city has. Supporters say we need safety; opponents say it's bad financial planning.",
    candidate_matches: [
      { name: "Matt Dorsey", alignment: "supports", source_link: "https://example.com/vote13", party: "Moderate", bio: "Former police spokesperson turned Supervisor.", gender: 'male' },
      { name: "Hillary Ronen", alignment: "opposes", source_link: "https://example.com/vote14", party: "Progressive", bio: "Argues against 'police set-asides' that cut into social services.", gender: 'female' },
      { name: "Daniel Lurie", alignment: "supports", source_link: "https://example.com/vote15", party: "Moderate", bio: "Campaigns heavily on increasing public safety resources.", gender: 'male' }
    ]
  },
  {
    stance_id: "fb-6",
    question: "Should the city aggressively sweep homeless encampments even if shelter beds aren't immediately available?",
    context: "Following the Grants Pass Supreme Court ruling, SF has intensified enforcement. This is a major dividing line.",
    analysis: "This is about people living in tents on the sidewalk. This policy says the police can make them move or take their tents away, even if there isn't an empty bed in a shelter for them to go to right that second. It cleans the streets, but critics ask: 'Where do they go?'",
    candidate_matches: [
      { name: "Mark Farrell", alignment: "supports", source_link: "https://example.com/vote16", party: "Moderate", bio: "Advocates for a zero-tolerance policy on street camping.", gender: 'male' },
      { name: "London Breed", alignment: "supports", source_link: "https://example.com/vote17", party: "Moderate", bio: "Issued executive orders to clear encampments citing safety.", gender: 'female' },
      { name: "Dean Preston", alignment: "opposes", source_link: "https://example.com/vote18", party: "Democratic Socialist", bio: "Calls these sweeps 'cruel and counterproductive'.", gender: 'male' }
    ]
  },
  {
    stance_id: "fb-7",
    question: "Should we offer tax breaks to convert vacant downtown offices into housing?",
    context: "Downtown SF has high vacancy rates. Measure C (2024) allowed for a one-time transfer tax waiver for such conversions.",
    analysis: "Downtown has a lot of empty office buildings because people work from home now. This rule says: 'Hey builders, if you turn these offices into apartments, you don't have to pay us certain taxes.' It encourages building homes, but the city loses out on some tax money.",
    candidate_matches: [
      { name: "London Breed", alignment: "supports", source_link: "https://example.com/vote19", party: "Moderate", bio: "Sponsored Measure C to revitalize downtown.", gender: 'female' },
      { name: "Aaron Peskin", alignment: "opposes", source_link: "https://example.com/vote20", party: "Progressive", bio: "Skeptical of giving tax breaks to large developers.", gender: 'male' },
      { name: "Ahsha Safaí", alignment: "supports", source_link: "https://example.com/vote21", party: "Moderate", bio: "Supports adaptive reuse to solve the housing crisis.", gender: 'male' }
    ]
  }
];