import requests
import time
from datetime import datetime

# Replace this with your actual Render URL when deployed
# e.g., "https://transitos-backend.onrender.com/health"
TARGET_URL = "http://localhost:8000/health"
PING_INTERVAL = 14 * 60  # 14 minutes (840 seconds)

def keep_alive():
    print(f"🛡️ Booting TransitOS Render Shield...")
    print(f"📡 Target: {TARGET_URL}")
    print(f"⏱️  Interval: {PING_INTERVAL / 60} minutes\n")

    while True:
        try:
            # We use a 10-second timeout so the script doesn't hang forever if the network drops
            response = requests.get(TARGET_URL, timeout=10)
            current_time = datetime.now().strftime("%H:%M:%S")
            
            if response.status_code == 200:
                print(f"[{current_time}] ✅ Ping successful. Server is awake.")
            else:
                print(f"[{current_time}] ⚠️ Ping returned status code: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            current_time = datetime.now().strftime("%H:%M:%S")
            print(f"[{current_time}] 🚨 Ping failed! Error: {e}")
        
        # Hibernate the script to save your local CPU until the next ping
        time.sleep(PING_INTERVAL)

if __name__ == "__main__":
    keep_alive()