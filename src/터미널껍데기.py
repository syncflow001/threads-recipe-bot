#!/usr/bin/python3
# 대시보드 「관리자 도구」의 터미널 한 창 — 진짜 pty 를 열어 zsh 를 띄우고, 노드와 바이트를 그대로 주고받는다.
# 노드에는 pty 가 없고 `script` 는 노드의 소켓 stdio 를 못 받아서(tcgetattr 실패, 실측) 맥에 원래 있는
# 파이썬의 pty 모듈로 연다. 새로 까는 것 없음.
#   fd 0 → 키 입력(그대로 pty 로)   fd 1 ← 화면 출력(pty 에서 그대로)   fd 3 → 크기 「cols rows\n」
import os, pty, sys, select, fcntl, termios, struct, signal

작업폴더 = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
크기줄 = 3  # 노드가 stdio 넷째 칸으로 넘긴다

pid, fd = pty.fork()
if pid == 0:
    os.chdir(작업폴더)
    env = dict(os.environ, TERM='xterm-256color', LANG=os.environ.get('LANG', 'ko_KR.UTF-8'))
    os.execve('/bin/zsh', ['-zsh', '-il'], env)  # 이름 앞의 - 는 로그인 셸 표시다

def 크기바꾸기(cols, rows):
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
    os.kill(pid, signal.SIGWINCH)

크기바꾸기(80, 24)
남은크기글 = b''
살아있는입력 = {0, 크기줄}
try:
    while True:
        읽을것, _, _ = select.select([fd] + sorted(살아있는입력), [], [])
        if fd in 읽을것:
            try:
                덩이 = os.read(fd, 65536)
            except OSError:
                break
            if not 덩이:
                break
            os.write(1, 덩이)
        if 0 in 읽을것:
            덩이 = os.read(0, 65536)
            if not 덩이:
                break   # 노드가 죽거나 입력을 닫았다 — 셸도 같이 끝낸다. 고아 셸을 남기지 않는다
            else:
                os.write(fd, 덩이)
        if 크기줄 in 읽을것:
            덩이 = os.read(크기줄, 4096)
            if not 덩이:
                살아있는입력.discard(크기줄)
            else:
                남은크기글 += 덩이
                while b'\n' in 남은크기글:
                    줄, 남은크기글 = 남은크기글.split(b'\n', 1)
                    try:
                        cols, rows = (int(v) for v in 줄.split())
                        if 0 < cols < 1000 and 0 < rows < 1000:
                            크기바꾸기(cols, rows)
                    except (ValueError, OSError):
                        pass
finally:
    try:
        os.kill(pid, signal.SIGHUP)
    except OSError:
        pass
_, 상태 = os.waitpid(pid, 0)
sys.exit(os.waitstatus_to_exitcode(status=상태) if hasattr(os, 'waitstatus_to_exitcode') else 0)
