#!/bin/sh
# Скриншот игры в headless Chrome: tests/shot.sh <файл.png> '<demo-параметры>' [ширина] [высота] [мс]
OUT="$1"; DEMO="$2"; W="${3:-1440}"; H="${4:-860}"; T="${5:-2500}"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=$W,$H --virtual-time-budget=$T --screenshot="$OUT" "http://localhost:8765/#demo=$DEMO" 2>/dev/null
