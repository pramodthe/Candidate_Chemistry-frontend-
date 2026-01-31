import os
from dotenv import load_dotenv

# 1. Setup Environment BEFORE importing other modules
load_dotenv()

# Import our Fireworks-configured model and other components
from deep_agents_from_scratch import get_model
from deep_agents_from_scratch.state import DeepAgentState
from deep_agents_from_scratch.todo_tools import write_todos, read_todos
from deep_agents_from_scratch.file_tools import ls, read_file, write_file
from deep_agents_from_scratch.research_tools import tavily_search, think_tool
from langchain.agents import create_agent


def run_agent_test():
    # 2. Initialize the Fireworks AI model (minimax-m2p1)
    model = get_model()

    # 3. Assemble tools
    all_tools = [
        write_todos,
        read_todos,
        ls,
        read_file,
        write_file,
        tavily_search,
        think_tool,
    ]

    # 4. Create the Deep Agent
    agent = create_agent(
        model,
        tools=all_tools,
        state_schema=DeepAgentState,
        system_prompt="""System Prompt: San Francisco Political Intelligence Agent (Lightweight Version)
Role: You are the Chief Political Data Officer for "Candidate Chemistry," a non-partisan civic engagement platform. Your goal is to generate structured, verified policy data on San Francisco politics (2025-2026 Election Cycle).
Objective: Identify high-conflict "wedge issues" where candidates have opposing views. Synthesize complex legislative history into simple, binary choices for a swipe-based UI.

CRITICAL EFFICIENCY RULES:
- MAXIMUM 5 search queries total - plan wisely
- Focus on MAYORAL candidates only (simpler scope)
- Generate only 3 stance cards (not 10)
- Use recent news articles as primary sources (faster than digging through Legistar)
- Stop after 15 minutes max - partial data is acceptable

1. Research Scope (Streamlined)
Candidates to Track (5 total):
* London Breed (incumbent mayor)
* Daniel Lurie (business leader)
* Aaron Peskin (supervisor, progressive)
* Mark Farrell (former supervisor)
* Ahsha Safaí (supervisor, moderate)

Primary Domains (Pick 3 most contentious):
* Housing (Upzoning vs. neighborhood preservation)
* Public Safety (Police staffing, Drug policies)
* Transportation (Great Highway, Slow Streets)

2. Research Rules (Simplified)
* Use recent news articles (2024-2025) about candidate positions
* Binary Classification: supports or opposes
* If position unclear from news, check official campaign websites
* Source Verification: Link to news article or .gov page
* SPEED OVER PERFECTION: If stuck on one candidate, skip them

3. Content Style Guide
* Question: Active voice, controversial (e.g., "Should we arrest drug users to compel treatment?")
* Analysis (ELI5): 5th-grade level, explain trade-offs, use analogies
* Neutrality: Present both sides fairly

4. Output Specification (JSON)
TypeScript interface:

interface StanceCard {
  stance_id: string; // e.g., "housing-01"
  question: string; // The controversial policy question
  context: string;  // 1-sentence objective context
  analysis: string; // ELI5 explanation (2-3 sentences)
  candidate_matches: {
    name: string;          // Full Name
    alignment: 'supports' | 'opposes'; 
    source_link: string;   // URL to proof
    party: string;         // e.g., "Moderate Democrat", "Progressive"
    bio: string;           // 1-sentence punchy bio
    gender: 'male' | 'female';
  }[];
}

5. Execution Task (Lightweight)
Generate exactly 3 Stance Cards on these hot topics:
1. Great Highway car-free debate
2. Housing upzoning / YIMBY vs NIMBY
3. Police staffing / public safety funding

Requirements:
* At least 3 candidates per card (can include just 3-4 if others lack clear positions)
* Mix of "supports" and "opposes" on each card
* Use recent news (2024-2025) - faster than voting records
* If search returns unclear results, move on - don't get stuck

6. Workflow (Efficient)
1. Create 1 TODO: "Generate 3 stance cards on housing, public safety, Great Highway"
2. Do 1-2 broad searches: "San Francisco mayoral candidates 2025 positions housing public safety"
3. Read the search results, extract positions
4. If missing info on specific candidate, do 1 targeted search for that candidate
5. Generate the 3 JSON stance cards
6. STOP - don't keep researching for perfection

Remember: 3 good cards > 10 perfect cards that never finish""",
    )

    print("🚀 Starting Agent Test with Fireworks AI...")

    config = {"configurable": {"thread_id": "test_thread"}}
    initial_state = {
        "messages": [
            {
                "role": "user",
                "content": "Search for the latest news about AI agentic workflows and save a brief summary to 'research_summary.md'",
            }
        ]
    }

    # Run the agent
    try:
        result = agent.invoke(initial_state, config=config)

        print("\n--- Final Agent Messages ---")
        for msg in result["messages"]:
            role = (
                "🤖 AI"
                if msg.type == "ai"
                else "👤 User"
                if msg.type == "human"
                else "🛠️ Tool"
            )
            content = (
                msg.content[:150] + "..." if len(msg.content) > 150 else msg.content
            )
            print(f"{role}: {content}")

        # Check for files in the final state and save them to disk
        if "files" in result and result["files"]:
            # Create a physical results directory
            output_dir = "results"
            os.makedirs(output_dir, exist_ok=True)

            print(f"\n--- Saving Virtual Files to Disk (./{output_dir}/) ---")
            for filename, content in result["files"].items():
                file_path = os.path.join(output_dir, filename)
                with open(file_path, "w") as f:
                    f.write(content)
                print(f"✅ Saved: {file_path} ({len(content)} bytes)")
        else:
            print("\n⚠️ No virtual files were created to save.")

    except Exception as e:
        print(f"❌ Error during execution: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    run_agent_test()
