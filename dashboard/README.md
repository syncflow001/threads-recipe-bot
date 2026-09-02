빌드는 저장소 뿌리에서 `node dashboard/node_modules/next/dist/bin/next build dashboard` 로 한다.
재시작은 `launchctl kickstart -k gui/$(id -u)/com.threads.dashboard` 로 한다.
검사는 저장소 뿌리에서 `node 검사/test.대시보드.mjs` 로 한다.

경고: `dashboard/` 안에서 `npm run dev`·`npm run start` 를 돌리면 엔진 경로가 틀어진다. 반드시 저장소 뿌리에서 실행한다.
