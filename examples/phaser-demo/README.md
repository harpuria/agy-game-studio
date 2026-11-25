# Star Catcher (Playtest 데모)

Game Dev Studio 패널을 게임 템플릿 없이 바로 써 볼 수 있는 최소 Phaser 4 게임입니다. 30초 동안 별을 모으고, 시간이 끝나면 `R`로 다시 시작합니다. 에셋 파일 없이 도형으로 그리므로 오프라인에서 동작합니다.

## 실행

```bash
cd examples/phaser-demo
npm ci
```

1. Antigravity에서 `/game-dev-studio`로 패널을 엽니다.
2. **Game folder**에 이 폴더의 절대 경로를 넣고 **▶ Run game**을 누릅니다.
3. 방향키 또는 `WASD`로 움직이고, `F8`로 멈춰 주석을 그린 뒤 **📸 Frame**이나 **🎞️ 10s GIF**를 대화로 보냅니다.

패널 없이 브라우저에서만 보려면 `npm run dev`를 실행합니다.

## 플러그인 점검

플러그인 루트에서 아래 명령을 실행하면 패널 흐름 전체(Run → 프레임 수신 → 일시정지 → 주석 → PNG·GIF → 종료)를 이 데모로 자동 점검합니다.

```bash
node tests/phaser-playtest-smoke.mjs
```

이 데모는 실제 게임의 출발점이 아닙니다. 새 게임은 [phaser-web-template](https://github.com/harpuria/phaser-web-template)의 `docs/template/APPLYING.md`로 시작합니다.
