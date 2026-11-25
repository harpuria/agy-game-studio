# Game Dev Studio

Antigravity에서 Phaser 웹 게임과 Godot 모바일·PC 게임을 만드는 플러그인입니다. 게임 프로젝트를 열고 `/vibe-game-developer`에 만들고 싶은 게임을 설명하면, 프로젝트에 맞는 스킬로 기획과 구현을 시작할 수 있습니다.

## 설치하기

Antigravity CLI에서 다음 명령을 실행한 뒤, Antigravity의 **Customizations → Installed**에서 **Game Dev Studio**가 활성화됐는지 확인합니다.

```sh
agy plugin install https://github.com/harpuria/agy-game-studio
```

에셋을 만드는 `game-studio` MCP 서버에는 Node.js와 Go 1.26 이상이 필요합니다. 게임 실행에 필요한 Node.js 또는 Godot 버전은 각 게임 저장소의 지침을 따릅니다.

## 게임 하나를 만드는 순서

1. **템플릿을 선택합니다.** 브라우저 게임은 [Phaser Web](https://github.com/harpuria/phaser-web-template), Android·iOS 게임은 [Godot Mobile](https://github.com/harpuria/godot-mobile-template), 데스크톱 게임은 [Godot PC](https://github.com/harpuria/godot-pc-template)로 시작합니다. 새 게임은 템플릿의 `docs/template/APPLYING.md`에 따라 생성합니다. 기존 게임은 해당 저장소를 Antigravity에서 바로 엽니다.
2. **첫 장면의 목표를 정합니다.** 채팅에 `/vibe-game-developer Phaser로 30초 동안 별을 모으는 게임을 만들고 싶어. 이동 조작과 한 판이 끝나는 조건부터 정리해 줘.`처럼 요청합니다. 합의한 규칙은 Phaser의 `docs/game/`, Godot의 `docs/`에 기록합니다.
3. **한 판을 끝까지 구현합니다.** 예를 들어 이동 → 별 획득 → 점수 표시 → 시간 종료까지 연결합니다. Phaser는 `src/game/`, Godot는 `game/`에 게임 규칙을 두고, 저장·입력·오디오는 템플릿이 제공하는 기능을 사용합니다.
4. **에셋을 붙이고 플레이합니다.** “별을 주웠을 때 짧은 효과음을 만들어 연결해 줘”처럼 게임 안에서 언제 쓰이는지 설명합니다. 아래 방법으로 실행해 조작과 피드백을 확인하고, 발견한 문제를 고쳐 다시 검증합니다.

## 어떤 스킬을 쓰나요?

| 스킬 | 쓰는 때 |
| --- | --- |
| [vibe-game-developer](skills/vibe-game-developer/SKILL.md) | 프로젝트의 템플릿을 확인하고 작업에 맞는 스킬을 선택할 때 |
| [game-design](skills/game-design/SKILL.md) | 플레이어의 목표, 조작, 반복 행동, 승패 조건을 정할 때 |
| [phaser-web](skills/phaser-web/SKILL.md) | Phaser 장면과 웹 입력을 구현하고 standalone·CrazyGames 빌드를 검증할 때 |
| [godot-game](skills/godot-game/SKILL.md) | Godot 장면을 만들고 모바일 광고·결제 또는 PC 입력·창 설정을 연결할 때 |
| [sprite-design](skills/sprite-design/SKILL.md) | 스프라이트 시트를 만들거나 프레임 크기와 애니메이션을 다듬을 때 |
| [procedural-sfx](skills/procedural-sfx/SKILL.md) · [procedural-music](skills/procedural-music/SKILL.md) | 각각 효과음과 배경음악을 합성해 WAV로 만들 때 |
| [nano-banana](skills/nano-banana/SKILL.md) · [lyria](skills/lyria/SKILL.md) | 각각 생성형 AI로 이미지와 음악을 만들 때 |
| [game-dev-studio](skills/game-dev-studio/SKILL.md) | Phaser 플레이 장면을 캡처하고 버그를 대화에 첨부할 때 |

스킬은 에셋 작업에 필요한 MCP 도구를 호출합니다. 생성형 AI 스킬을 사용할 때는 Antigravity 실행 환경에 Gemini API 키(`GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`)를 설정하거나 Vertex AI 인증을 구성합니다.

## 실행과 검증

아래 명령은 **게임 저장소의 루트**에서 실행합니다.

| 대상 | 플레이 | 변경 후 검증 |
| --- | --- | --- |
| Phaser Web | 처음에 `npm ci`, 이후 `npm run dev:standalone` | `npm run check`. UI를 수정했다면 `npm run test:e2e` |
| Godot Mobile | Godot에서 `project.godot`를 열고 **F5** | [모바일 통합 검사](skills/godot-game/references/mobile.md)를 실행하고 터치·광고·결제는 실기기에서 확인 |
| Godot PC | Godot에서 `project.godot`를 열고 **F5** | `bash tools/validate.sh`를 실행하고 배포 빌드는 대상 OS에서 확인 |

**Phaser에서 버그 장면을 공유하려면** 게임 루트에서 `node /path/to/agy-game-studio/scripts/playtest-phaser.mjs`를 실행합니다. 경로는 플러그인의 실제 설치 경로로 바꿉니다. Antigravity에서 `/game-dev-studio`를 열고 터미널에 표시된 주소로 **Connect to game**을 누릅니다. **F8**로 멈춘 뒤 **Frame**으로 주석을 그린 PNG를, **GIF**로 최근 최대 10초의 플레이 영상을 현재 대화에 첨부할 수 있습니다.

플러그인 자체를 수정할 때는 플러그인 루트에서 `npm ci`, `npm test`, `npm run build`를 실행합니다. [개발 명령 안내](scripts/README.md)

원작은 Daniela Petruzalek의 [agy-game-studio](https://github.com/danicat/agy-game-studio)이며, 라이선스는 [Apache 2.0](LICENSE)입니다.
