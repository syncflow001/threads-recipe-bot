#!/bin/bash
# 설정 화면을 늘 켜 둔다 — 맥이 켜지면 저절로 뜨고, 꺼지면 다시 뜬다. 주소를 북마크해 쓴다
cd "$(dirname "$0")" || exit 1
HOME_DIR="$(pwd)"
LABEL=com.threads.dashboard
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PORT=${PORT:-7788}

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js 가 없습니다. https://nodejs.org 에서 설치해 주세요."
  read -r -p "  엔터를 누르면 닫힙니다. "; exit 1
fi

# 아이폰에서도 열려면 테일스케일 주소로 묶어야 한다. 없으면 이 컴퓨터에서만 연다.
# 0.0.0.0 은 쓰지 않는다 — 같은 와이파이의 아무나 들어온다
TS=$(tailscale ip -4 2>/dev/null | head -1)
BIND=${TS:-127.0.0.1}

mkdir -p "$HOME_DIR/logs"
cat > "$PLIST" <<PLISTEND
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(command -v node)</string>
    <string>--env-file=$HOME_DIR/.env.local</string>
    <string>$HOME_DIR/설정화면.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$HOME_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME_DIR/logs/설정화면.out</string>
  <key>StandardErrorPath</key><string>$HOME_DIR/logs/설정화면.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>LANG</key><string>ko_KR.UTF-8</string>
    <key>BIND</key><string>$BIND</string>
    <key>PORT</key><string>$PORT</string>
    <key>NOOPEN</key><string>1</string>
  </dict>
</dict>
</plist>
PLISTEND

launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST" || { echo "  등록에 실패했습니다."; read -r -p "  엔터. "; exit 1; }

# 열쇠말은 설정화면.mjs 가 만든다. 뜰 때까지 잠깐 기다린다
for _ in 1 2 3 4 5 6 7 8 9 10; do
  [ -s "$HOME_DIR/.설정화면열쇠" ] && break
  /bin/sleep 1
done
KEY=$(cat "$HOME_DIR/.설정화면열쇠" 2>/dev/null | tr -d '[:space:]')

echo ""
echo "  ╭──────────────────────────────────────────╮"
echo "  │  이제 늘 켜져 있습니다                    │"
echo "  ╰──────────────────────────────────────────╯"
echo ""
echo "  아래 주소를 북마크해 두세요. 바뀌지 않습니다."
echo ""
echo "    http://$BIND:$PORT/?k=$KEY"
echo ""
if [ -n "$TS" ]; then
  echo "  같은 주소를 아이폰에서도 씁니다 (테일스케일이 켜져 있어야 합니다)."
else
  echo "  이 컴퓨터에서만 열립니다. 아이폰에서도 쓰려면 테일스케일을 켜고 다시 눌러 주세요."
fi
echo ""
echo "  끄려면 터미널에 이렇게 칩니다."
echo "    launchctl unload ~/Library/LaunchAgents/$LABEL.plist"
echo ""
read -r -p "  엔터를 누르면 이 창이 닫힙니다. "
