@echo off
REM Auto-start Circle backend + Cloudflare Tunnel
start "Circle Backend" cmd /k "cd /d C:\Users\b\Desktop\GUI\circle\server && npm run dev"
start "Circle Tunnel" cmd /k "cloudflared tunnel --url http://localhost:5000"
