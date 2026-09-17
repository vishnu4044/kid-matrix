from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    # host="0.0.0.0" so devices on the same WiFi (e.g. an iPad) can reach this
    # server via the machine's LAN IP, not just 127.0.0.1. Port 5050, not 5000,
    # because macOS's AirPlay Receiver squats on *:5000 and blocks it entirely.
    app.run(debug=True, port=5050, host="0.0.0.0")
