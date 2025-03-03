@echo off
REM Open Windows Terminal with three tabs
wt -w 0 nt -p "Command Prompt" --title "Llama LLM" --tabColor "#FF0000" -d ./ cmd /c ".\llama.cpp\build\bin\Release\llama-server.exe -m .\models\qwen257b.gguf --host 0.0.0.0 --port 8080 -t 4 -c 2048 -ngl 40"
wt -w 0 nt -p "Command Prompt" --title "Flask Backend" --tabColor "#00FF00" -d ./ python backend_server.py
wt -w 0 nt -p "Command Prompt" --title "Python Frontend" --tabColor "#0000FF" -d ./ python -m http.server 8000