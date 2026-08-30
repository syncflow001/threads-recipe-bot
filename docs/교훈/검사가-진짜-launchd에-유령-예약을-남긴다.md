---
name: 검사가-진짜-launchd에-유령-예약을-남긴다
description: 검사가 임시 launchd 폴더를 넘겨도, 가짜 실행기를 안 넣으면 진짜 launchd 에 job 이 등록된다 — 옮기기·되돌리기처럼 launchd 를 쓰는 도구를 검사할 때 본다
status: 확정
confidence: 상
date: 2026-08-28
tags: [안전, 계정, 검사]
---

## 믿었던 것

검사에 `런치폴더` 로 임시 폴더를 넘겼으니 진짜 launchd 는 안 건드린다고 믿었다.
검토 셋이 「임시 폴더를 넘겼나」는 봤지만 **「가짜 실행기(`실행`)를 넘겼나」는 아무도 안 봤다.**

## 해본 것

첫 계정 이름 붙이기 Task 3, 실제 옮기기 직전에 습관대로 `launchctl list` 를 봤다.

## 나온 것

유령 예약 둘(`com.threads.auto.example.cook`·`com.threads.score.example.cook`)이 **진짜 시스템에
등록**돼 있었다. `launchctl print` 로 보니 `path = /private/var/folders/…/T/첫계정이름-zhb63e/launchd테스트/…`,
`runs = 0`. 동시에 진짜 `com.example.threads`·`com.threads.score.main` 은 **내려가 있었다** — 다음 20:02
발행이 안 뜰 상태였다(16:02 발행은 정상으로 나갔고 17:14 에 발견해 실제 누락은 없었다).

원인은 `test.첫계정이름붙이기.mjs` 의 `옮기기(...)` 호출 다섯이 `마른판: false` 인데 `실행` 을 안 넘겨
기본값(진짜 `execFile`)을 쓴 것. **plist 파일은 임시 폴더에 났지만 `launchctl load` 는 파일 위치와
무관하게 라벨로 진짜 launchd 에 job 을 등록한다** — 이게 핵심이다.

## 지금 결론

**임시 폴더를 넘기는 것만으로는 안 된다 — `실행`(execFile) 도 반드시 가짜로 주입해야 진짜 launchd 가
안전하다.** `도구.첫계정이름붙이기.mjs:22~28` 의 `실행고르기()` 가 **임시 런치폴더 + 실행 미주입** 조합이면
던지도록 고쳤다(커밋 a8790e3). 검사 전후로 `launchctl list` 를 찍어 `diff` 가 빈 것을 확인하는 습관도
결론에 넣는다 — launchd 를 건드리는 도구를 검사할 때는 실행 전후로 반드시 이 대조를 한다.

되살리는 법 — `launchctl bootout gui/$UID/<라벨>` 로 유령 job 을 지운 뒤
`launchctl load ~/Library/LaunchAgents/<옛라벨>.plist` 로 옛 job 을 되살린다.

[[검사가-실서버-장부를-쓰면-안-된다]] 와 형제다 — 그 카드는 **파일**을 다뤘고 이번 것은 **launchd** 다.

## 아직 모르는 것

이 저장소의 다른 검사가 진짜 launchd·진짜 파일을 건드리는지는 이번에 `test.첫계정이름붙이기.mjs` 만 봤다.
