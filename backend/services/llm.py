import os
import json
import time
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

def _require_env(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable '{var_name}'. "
            "Set it in your environment or backend/.env file."
        )
    return value

BASE_URL = _require_env("LLM_BASE_URL")
API_KEY = _require_env("LLM_API_KEY")

client = AsyncOpenAI(base_url=BASE_URL, api_key=API_KEY)

async def stream_llm_response(message: str, history: list, on_complete=None, top_p=0.9, temperature=0.7):
    """
    Streams the response from the LLM.
    on_complete: async callback function(content, duration_ms)
    """
    messages = history + [{"role": "user", "content": message}]
    
    start_time = time.time()
    full_content = ""
    
    try:
        stream = await client.chat.completions.create(
            model="qwen/qwen3-1.7b", # LM Studio usually ignores this or maps it to the loaded model
            messages=messages,
            stream=True,
            temperature=temperature,
            top_p=top_p
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_content += content
                # SSE format: data: <content>\n\n
                yield f"data: {json.dumps({'content': content})}\n\n"
        
        end_time = time.time()
        duration_ms = int((end_time - start_time) * 1000)
        
        if on_complete:
            await on_complete(full_content, duration_ms)
            
        # Send metadata as the final event
        yield f"data: {json.dumps({'type': 'metadata', 'duration_ms': duration_ms})}\n\n"
                
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
