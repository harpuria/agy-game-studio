---
name: game-dev-studio
description: Phaser 게임을 Antigravity Playtest 패널에서 실행하거나 프레임에 주석을 달고 DVR GIF를 첨부할 때 사용한다.
license: Apache-2.0
---

# Phaser Playtest

1. Phaser 게임 루트에서 프로젝트의 Node 버전을 활성화하고 의존성이 없으면 npm ci를 실행한다.
2. 게임 루트를 작업 디렉터리로 유지하고 설치된 이 플러그인의 절대 경로로 `node /path/to/agy-game-studio/scripts/playtest-phaser.mjs`를 실행한다. 이 명령은 게임 자체 Vite 설정의 standalone 모드에 캡처 스크립트를 추가한다. 출력된 로컬 주소와 포트를 확인한다.
3. [Game Dev Studio](sidecar://agy-game-studio/studio/playtest)를 열고 해당 주소를 입력해 Connect to game을 누른다. 첫 프레임이 도착하면 게임 조작을 확인한다.
4. F8로 일시정지하고 타임라인에서 프레임을 선택한다. 버그 위치를 표시한 후 Frame으로 주석 PNG를, GIF로 최근 게임 화면의 애니메이션을 현재 대화에 첨부한다. 테스트가 끝나면 시작한 게임 서버를 종료한다.
