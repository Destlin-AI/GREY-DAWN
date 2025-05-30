from llama_cpp import Llama
import sys
import json
import os

def initialize_model():
    # Path to the model file - adapt if needed
    model_path = r"D:\Project_AI\models\gguf\Llama-3-8B-Instruct-Gradient-1048k-Q3_K_M.gguf"
    
    # Check if model exists
    if not os.path.exists(model_path):
        # Try alternate paths that might exist in the environment
        alternate_paths = [
            "./models/Llama-3-8B-Instruct-Gradient-1048k-Q3_K_M.gguf",
            "../models/Llama-3-8B-Instruct-Gradient-1048k-Q3_K_M.gguf",
            "./Llama-3-8B-Instruct-Gradient-1048k-Q3_K_M.gguf"
        ]
        
        for path in alternate_paths:
            if os.path.exists(path):
                model_path = path
                break
        else:
            print(f"Error: Model file not found at {model_path} or alternate locations")
            sys.exit(1)
    
    # Initialize the model
    llm = Llama(
        model_path=model_path,
        n_ctx=8192,
        n_gpu_layers=35,
        use_mlock=True
    )
    
    return llm

def process_prompt(llm, prompt):
    """Process a single prompt and return the response"""
    response = llm(prompt)
    answer = response['choices'][0]['text'].strip()
    return answer

def main():
    # Initialize the model
    llm = initialize_model()
    
    # Check if prompt is provided as command line argument
    if len(sys.argv) > 1:
        # The prompt is provided as a command line argument
        prompt = sys.argv[1]
        answer = process_prompt(llm, prompt)
        print(answer)
    else:
        # Interactive mode
        print("🧠 Connected to Llama 3 — ready to talk. Type 'exit' to quit.\n")
        history = ""
        
        while True:
            user_input = input("🧍 You: ")
            if user_input.lower() in ["exit", "quit"]:
                break
                
            full_prompt = f"{history}\nUser: {user_input}\nAssistant:"
            answer = process_prompt(llm, full_prompt)
            
            print(f"🤖 Brain: {answer}\n")
            history += f"\nUser: {user_input}\nAssistant: {answer}"

if __name__ == "__main__":
    main()
