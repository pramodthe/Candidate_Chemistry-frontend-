import os
from langchain_openai import ChatOpenAI

def get_model(model_name="accounts/fireworks/models/minimax-m2p1"):
    """Get the configured language model.
    
    Default is Fireworks AI's minimax-m2p1 with recommended parameters.
    """
    return ChatOpenAI(
        model=model_name,
        openai_api_key=os.getenv("FIREWORKS_API_KEY"),
        openai_api_base="https://api.fireworks.ai/inference/v1",
        temperature=0.6,
        max_tokens=25600,
        top_p=1,
        extra_body={
            "top_k": 40,
        }
    )
