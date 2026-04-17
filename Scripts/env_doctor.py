import os
from dotenv import dotenv_values, find_dotenv

def run_diagnostics():
    print("🩺 Booting TransitOS Environment Doctor...\n")
    
    env_path = find_dotenv()
    if not env_path:
        print("❌ CRITICAL: No .env file found anywhere in the directory tree!")
        return

    print(f"✅ Found .env file at: {env_path}")
    print("\n🔍 EXACT VARIABLES PYTHON IS READING:")
    
    # dotenv_values reads the file exactly as is, without system env vars mixing in
    raw_vars = dotenv_values(env_path)
    
    if not raw_vars:
        print("   (File is completely empty!)")
    
    for key, value in raw_vars.items():
        # Truncate the value so we don't leak the whole private key on screen
        safe_value = f"{value[:15]}..." if value and len(value) > 15 else value
        print(f"   Key: '{key}'  --->  Value: '{safe_value}'")
        
    print("\n🚨 DIAGNOSIS:")
    is_healthy = True
    
    if "ALCHEMY_RPC_URL" not in raw_vars:
        print("❌ MISSING EXACT KEY: 'ALCHEMY_RPC_URL'")
        is_healthy = False
        # Check for the classic rich-text copy-paste bug
        if any("ALCHEMY" in k and "\\" in k for k in raw_vars.keys()):
            print("   👉 CAUSE: You have backslashes (\\) in the variable name! Delete them.")
            
    if "PRIVATE_KEY" not in raw_vars:
        print("❌ MISSING EXACT KEY: 'PRIVATE_KEY'")
        is_healthy = False
        if any("PRIVATE" in k and "\\" in k for k in raw_vars.keys()):
            print("   👉 CAUSE: You have backslashes (\\) in the variable name! Delete them.")

    if is_healthy:
        print("✅ SUCCESS: The required keys are present and spelled perfectly.")
        print("If the bridge still fails, your Alchemy URL or MetaMask Key itself might be invalid.")

if __name__ == "__main__":
    run_diagnostics()