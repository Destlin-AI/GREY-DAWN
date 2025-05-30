from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import asyncio
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

app = FastAPI()

# Store loaded models
models = {}

class ModelRequest(BaseModel):
    model_id: str
    model_type: str  # "phi-3", "llama-3", "mixtral", etc.
    task: str
    inputs: dict

@app.post("/load_model")
async def load_model(request: ModelRequest):
    if request.model_id not in models:
        # Select model based on type
        if request.model_type == "phi-3-mini":
            model_path = "microsoft/phi-3-mini"
        elif request.model_type == "llama-3-8b":
            model_path = "meta-llama/Meta-Llama-3-8B"
        else:
            model_path = request.model_type
            
        # Load model - for production would need proper batching and optimization
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(
            model_path, 
            torch_dtype=torch.float16, 
            device_map="auto"
        )
        
        models[request.model_id] = {"model": model, "tokenizer": tokenizer}
        
    return {"status": "Model loaded", "model_id": request.model_id}

@app.post("/generate")
async def generate(request: ModelRequest):
    if request.model_id not in models:
        return {"error": "Model not loaded"}
        
    model_data = models[request.model_id]
    model = model_data["model"]
    tokenizer = model_data["tokenizer"]
    
    inputs = tokenizer(request.inputs["prompt"], return_tensors="pt").to(model.device)
    
    with torch.no_grad():
        outputs = model.generate(
            inputs.input_ids,
            max_new_tokens=500,
            temperature=0.7,
        )
        
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    return {"response": response}
