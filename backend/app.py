import eventlet
eventlet.monkey_patch()

import base64
import time
import threading
import os
import io
import requests
from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")



# Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
    MODEL_ID = 'gemini-2.0-flash'
else:
    print("Warning: GEMINI_API_KEY not found in environment variables.")
    client = None

def send_telegram_alert(message, image_bytes=None):
    """Sends an alert to a Telegram chat"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("Telegram not configured. Skipping notification.")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/"
    
    try:
        if image_bytes:
            files = {'photo': ('alert.jpg', image_bytes, 'image/jpeg')}
            payload = {'chat_id': TELEGRAM_CHAT_ID, 'caption': message}
            requests.post(url + "sendPhoto", data=payload, files=files)
        else:
            payload = {'chat_id': TELEGRAM_CHAT_ID, 'text': message}
            requests.post(url + "sendMessage", data=payload)
        print("Telegram alert sent.")
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}")

@app.route('/')
def index():
    return "SentinelAI Backend is running."

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('trigger_anomaly')
def handle_trigger_anomaly(data):
    """Handle an anomaly triggered by the frontend"""
    try:
        # Decode base64 image
        header, encoded = data['image'].split(",", 1)
        image_data = base64.b64decode(encoded)
        
        timestamp = time.strftime("%H:%M:%S")
        emit('anomaly_detected', {'timestamp': timestamp, 'message': 'Suspect posture detected.'}, broadcast=True)
        
        # Trigger AI Analysis in background
        threading.Thread(target=run_ai_analysis, args=(image_data, timestamp)).start()
            
    except Exception as e:
        print(f"Error handling anomaly: {e}")

def run_ai_analysis(image_bytes, timestamp):
    """Run Gemini Vision analysis on the captured frame"""
    if not client:
        analysis = "[Simulated AI Analysis]: High threat detected. Individual in aggressive posture. Immediate intervention suggested."
        socketio.emit('ai_analysis', {'timestamp': timestamp, 'analysis': analysis})
        return

    try:
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL image to bytes for the new SDK
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        img_bytes = img_byte_arr.getvalue()
        
        prompt = "This is a security camera snapshot. Analyze the scene for threats, suspicious behavior, or anomalies. Be concise. If there is a clear threat, start with [HIGH THREAT]."
        
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg'),
                prompt
            ]
        )

        analysis = response.text
        
        socketio.emit('ai_analysis', {'timestamp': timestamp, 'analysis': analysis})
        
        # If high threat detected by AI, send Telegram alert
        if "[HIGH THREAT]" in analysis.upper():
            send_telegram_alert(f"🚨 SENTINEL AI ALERT\nTimestamp: {timestamp}\nAnalysis: {analysis}", image_bytes)
            
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            print("AI Rate limit hit. Sending throttling message.")
            socketio.emit('ai_analysis', {'timestamp': timestamp, 'analysis': "[SYSTEM THROTTLED]: AI Analysis temporarily suspended due to rate limits. Local tracking remains active."})
        else:
            print(f"AI Analysis error: {e}")
            socketio.emit('ai_analysis', {'timestamp': timestamp, 'analysis': f"Error during analysis: {error_msg}"})
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"SentinelAI Backend starting on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
