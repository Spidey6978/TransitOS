import sqlite3

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

conn.commit()
conn.close()

print("Database created successfully")