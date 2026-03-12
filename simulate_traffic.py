import sqlite3
import random
import time

# Mumbai coordinates (sample)
locations = [
    (19.0760, 72.8777),  # Mumbai Central
    (19.2183, 72.9781),  # Thane
    (19.0330, 72.8450),  # Bandra
    (19.1100, 72.8500),  # Andheri
    (19.2000, 72.9700)   # Borivali
]

while True:

    start = random.choice(locations)
    end = random.choice(locations)

    conn = sqlite3.connect("traffic.db")
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS traffic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_lat REAL,
        start_lon REAL,
        end_lat REAL,
        end_lon REAL
    )
    """)

    cursor.execute(
        "INSERT INTO traffic (start_lat,start_lon,end_lat,end_lon) VALUES (?,?,?,?)",
        (start[0], start[1], end[0], end[1])
    )

    conn.commit()
    conn.close()

    print("Traffic event inserted")

    time.sleep(2)