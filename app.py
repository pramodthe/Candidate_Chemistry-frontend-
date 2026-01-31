import streamlit as st
import os
from dotenv import load_dotenv
import time

# 1. Setup Environment and Page Config
st.set_page_config(
    page_title="Deep Agent Explorer",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for Premium Look
st.markdown(
    """
<style>
    .main {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        color: #e2e8f0;
    }
    .stChatMessage {
        background-color: rgba(30, 41, 59, 0.7) !important;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 15px !important;
        margin-bottom: 1rem;
        backdrop-filter: blur(10px);
    }
    .stChatInputContainer {
        padding-bottom: 2rem;
    }
    .st-emotion-cache-1c7n2tu {
        background-color: transparent !important;
    }
    .sidebar .sidebar-content {
        background-color: #0f172a;
    }
    h1, h2, h3 {
        color: #60a5fa !important;
        font-family: 'Outfit', sans-serif;
    }
    .tool-box {
        background-color: rgba(59, 130, 246, 0.1);
        border-left: 4px solid #3b82f6;
        padding: 10px;
        margin: 5px 0;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.85rem;
    }
    .file-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
</style>
""",
    unsafe_allow_html=True,
)

# LOAD DOTENV
load_dotenv()

# Import Agent Components
from deep_agents_from_scratch import get_model
from deep_agents_from_scratch.state import DeepAgentState
from deep_agents_from_scratch.todo_tools import write_todos, read_todos
from deep_agents_from_scratch.file_tools import ls, read_file, write_file
from deep_agents_from_scratch.research_tools import tavily_search, think_tool
from langchain.agents import create_agent

# Initialize session state for agent and memory
if "messages" not in st.session_state:
    st.session_state.messages = []

if "files" not in st.session_state:
    st.session_state.files = {}

if "todos" not in st.session_state:
    st.session_state.todos = []


# Cached Agent Creation
@st.cache_resource
def get_agent():
    model = get_model()
    all_tools = [
        write_todos,
        read_todos,
        ls,
        read_file,
        write_file,
        tavily_search,
        think_tool,
    ]
    return create_agent(
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


agent = get_agent()

# Sidebar: Virtual Files and System State
with st.sidebar:
    st.title("📂 Virtual Memory")

    if st.session_state.files:
        st.subheader("Files")
        for filename in st.session_state.files.keys():
            with st.expander(f"📄 {filename}"):
                st.code(st.session_state.files[filename], language="markdown")
    else:
        st.info("No files in virtual memory yet.")

    st.divider()

    if st.session_state.todos:
        st.subheader("✅ TODO List")
        for i, todo in enumerate(st.session_state.todos):
            status_map = {"pending": "⏳", "in_progress": "🔄", "completed": "✅"}
            st.write(f"{status_map.get(todo['status'], '')} {todo['content']}")

    if st.button("Clear Session"):
        st.session_state.messages = []
        st.session_state.files = {}
        st.session_state.todos = []
        st.rerun()

# Main Interface
# --- LEADER / HERO SECTION ---
st.markdown(
    """
    <div style="background: rgba(59, 130, 246, 0.1); padding: 2rem; border-radius: 20px; border: 1px solid rgba(59, 130, 246, 0.2); margin-bottom: 2rem; text-align: center;">
        <h1 style="margin: 0; font-size: 2.5rem;">⚡ Deep Agent Research System</h1>
        <p style="color: #94a3b8; font-size: 1.1rem; margin-top: 0.5rem;">Autonomous Research • Context Offloading • Fireworks AI</p>
    </div>
""",
    unsafe_allow_html=True,
)

# Process Logs (for debugging "no output file")
log_container = st.expander("📝 Verbose Process Logs", expanded=False)

# Display Chat History
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# User Input
if prompt := st.chat_input("What would you like me to research?"):
    # Add user message to history
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Agent Processing
    with st.chat_message("assistant"):
        response_container = st.empty()
        full_response = ""

        # Prepare state
        config = {"configurable": {"thread_id": "streamlit_session"}}
        initial_state = {
            "messages": [
                {"role": f"{m['role']}", "content": m["content"]}
                for m in st.session_state.messages
            ],
            "files": st.session_state.files,
            "todos": st.session_state.todos,
        }

        # Execute streaming
        try:
            for chunk in agent.stream(initial_state, config=config):
                # LOGGING: Print chunk to help debug
                log_container.write(f"🔍 Chunk received: `{list(chunk.keys())}`")

                # RECURSIVE STATE UPDATE: Search for files/todos in any sub-key
                def update_state_recursive(data):
                    if isinstance(data, dict):
                        if "files" in data:
                            st.session_state.files.update(data["files"])
                            log_container.success(
                                f"📂 Captured {len(data['files'])} file update(s)"
                            )
                            # Automatically export to physical disk for visibility
                            os.makedirs("results", exist_ok=True)
                            for fname, content in data["files"].items():
                                with open(os.path.join("results", fname), "w") as f:
                                    f.write(content)

                        if "todos" in data:
                            st.session_state.todos = data["todos"]
                            log_container.info(
                                f"✅ Captured {len(data['todos'])} TODO update(s)"
                            )

                        for k, v in data.items():
                            if k not in ["files", "todos", "messages"]:
                                update_state_recursive(v)

                update_state_recursive(chunk)

                # Handle Messages
                # Messages can be at the root or inside a node key (e.g., 'agent')
                msgs = []
                if "messages" in chunk:
                    msgs = chunk["messages"]
                else:
                    for v in chunk.values():
                        if isinstance(v, dict) and "messages" in v:
                            msgs = v["messages"]

                for msg in msgs:
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for tc in msg.tool_calls:
                            st.markdown(
                                f'<div class="tool-box">🛠️ Calling: <b>{tc["name"]}</b></div>',
                                unsafe_allow_html=True,
                            )

                    elif msg.type == "ai" and msg.content:
                        full_response += msg.content
                        response_container.markdown(full_response + "▌")

                time.sleep(0.05)

            # Final update
            response_container.markdown(full_response)
            st.session_state.messages.append(
                {"role": "assistant", "content": full_response}
            )
            st.rerun()

        except Exception as e:
            st.error(f"Error during execution: {e}")
            import traceback

            st.code(traceback.format_exc())
