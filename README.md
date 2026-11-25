# Game Dev Studio

Antigravity에서 [Phaser Web](https://github.com/harpuria/phaser-web-template), [Godot Mobile](https://github.com/harpuria/godot-mobile-template), [Godot PC](https://github.com/harpuria/godot-pc-template)와 그 파생 게임을 개발하기 위한 플러그인이다. 게임별 작업은 템플릿의 도구로 실행하고, 스프라이트와 오디오는 공용 MCP에서 생성한다.

## 게임 개발

게임 저장소를 Antigravity에서 열고 `/vibe-game-developer`로 시작한다. 새 게임은 대상 템플릿의 `docs/template/APPLYING.md`, 기존 게임은 로컬 `AGENTS.md`와 기록된 템플릿 출처를 따른다.

| 게임 | 실행 | 검증 |
| --- | --- | --- |
| [Phaser Web](skills/phaser-web/SKILL.md) | 게임에서 `npm ci` 후 `npm run dev:standalone` | `npm run check`, UI 변경 시 `npm run test:e2e` |
| [Godot Mobile](skills/godot-game/references/mobile.md) | 고정 버전의 Godot Standard로 프로젝트를 열고 F5 | headless import 후 통합 장면의 기본·disabled·native 시나리오 |
| [Godot PC](skills/godot-game/references/pc.md) | 고정 버전의 Godot Standard로 프로젝트를 열고 F5 | `bash tools/validate.sh`, 타깃 OS에서 배포 빌드 확인 |

기획은 `game-design`, 스프라이트는 `sprite-design`, 오디오는 `procedural-sfx`와 `procedural-music`을 사용한다. `nano-banana`와 `lyria`는 선택적인 생성형 에셋 도구다.

## Phaser Playtest 패널

1. Phaser 게임 루트에서 의존성을 설치한 뒤 `node /path/to/agy-game-studio/scripts/playtest-phaser.mjs`를 실행한다. 게임 프로젝트의 Vite와 standalone 설정으로 캡처용 서버가 시작된다.
2. Antigravity에서 `/game-dev-studio`로 패널을 열고 서버가 출력한 로컬 주소를 입력한다. **Connect to game**을 누르면 첫 프레임 도착 후 일시정지 버튼이 활성화된다.
3. F8로 멈추고 타임라인에서 프레임을 골라 주석을 그린다. **Frame**은 주석 PNG, **GIF**는 최근 최대 10초의 게임 캔버스를 활성 대화로 보낸다. 모바일 브라우저 입력, 실제 스토어 SDK, 네이티브 Godot 게임은 각 대상 환경에서 검증한다.

## 플러그인 설치

Antigravity는 저장소의 `dist/`에서 UI를 읽는다. 에셋 MCP 실행에는 Node와 Go 1.26 이상이 필요하다. 게임 프로젝트의 Node·Godot 버전은 해당 템플릿에서 확인한다.

### 1. Install the plugin

Choose the installation method for your Antigravity surface:

#### Antigravity CLI (`agy`)

Install directly from GitHub in your shell:

```bash
agy plugin install https://github.com/harpuria/agy-game-studio
```

Or inside an interactive `agy` TUI session using `/plugin`:

```text
/plugin install https://github.com/harpuria/agy-game-studio
```

#### Antigravity 2.0 and Antigravity IDE

Place (or symlink) the plugin directory in one of Antigravity's plugin discovery roots:

- **Global (all workspaces)**:
  - **macOS / Linux**: `~/.gemini/config/plugins/agy-game-studio`
  - **Windows**: `%USERPROFILE%\.gemini\config\plugins\agy-game-studio`

  ```bash
  git clone https://github.com/harpuria/agy-game-studio.git ~/.gemini/config/plugins/agy-game-studio
  ```

- **Symlinked local checkout (recommended for local development or testing)**:
  Clone anywhere and link your working tree into the global plugins folder so Antigravity loads edits directly from your checkout:

  ```bash
  ln -s /path/to/agy-game-studio ~/.gemini/config/plugins/agy-game-studio
  ```

- **Workspace (project-scoped)**:
  Place the plugin at `.agents/plugins/agy-game-studio` in your repository root, or declare its parent directory in `.agents/plugins.json` (workspace) or `~/.gemini/config/plugins.json` (global):

  ```json
  {
    "entries": [
      { "path": "/path/to/plugins" }
    ]
  }
  ```

### 2. Enable the plugin

1. If you created or symlinked a new plugin directory manually on disk, **restart Antigravity** so it discovers the directory on startup.
2. In **Antigravity 2.0** or **Antigravity IDE**, open **Customizations** in the left sidebar, select the **Installed** tab, and verify **Game Dev Studio** (`agy-game-studio`) is enabled. (Or run `/plugin` in chat / `agy plugin enable agy-game-studio` in the CLI.)
3. Once enabled, Antigravity automatically starts and supervises both the `agy-game-studio/studio` sidecar process and the `game-studio` stdio MCP server (`mcp_config.json`).

### Optional Gemini and Vertex AI credentials

Procedural audio (`.music`, `.sfx`), procedural or `.aseprite` sprites, sprite normalization, and standalone Phaser playtesting after dependency installation work completely offline. To enable generative AI assets via **`image_generate`** (Nano Banana) and **`music_generate`** (Lyria) in the `game-studio` MCP tools, configure one of two Google Gen AI authentication modes:

- **Option 1: Vertex AI / Gemini Enterprise (Application Default Credentials)**:

  ```bash
  gcloud auth application-default login
  export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
  export GOOGLE_CLOUD_LOCATION="global"
  export GOOGLE_GENAI_USE_ENTERPRISE="true" # or GOOGLE_GENAI_USE_VERTEXAI="true"
  ```

- **Option 2: Gemini Developer API (API key)**:

  ```bash
  export GEMINI_API_KEY="your-api-key" # or GOOGLE_API_KEY
  ```

## Bundled MCP Server (`game-studio`, 10 Tools)

`mcp_config.json` exposes the unified headless Go engine server (`mcp/`) over stdio using `scripts/run-mcp.mjs`, providing 10 tools for Antigravity agents with zero Python or `uv` dependency:

| Tool | Purpose |
| :--- | :--- |
| `sound_presets` | Lists the 18 built-in SFX archetype presets, music wave types, YM2612 FM patches, and classical tempo markings. |
| `music_synthesize` | Synthesizes and analyzes a `.music` DSL score to 16-bit 44.1 kHz stereo WAV and optional per-track binary stems. |
| `music_validate` | Validates a `.music` DSL score against production BGM music theory, consonance, drift, channel count, and duration rules. |
| `sfx_synthesize` | Synthesizes and validates a `.sfx` DSL sound effect cue to 16-bit 44.1 kHz stereo WAV. |
| `sprite_inspect` | Inspects a `.sprite` container, binary `.aseprite`/`.ase` file, or `.png` sprite sheet and optionally exports a rendered PNG. |
| `sprite_compile` | Compiles a `.sprite` DSL spec and optionally writes packed `.png` sheets, `.aseprite` binaries, `.json` manifests, previews, and `.gif` previews. |
| `sprite_normalize` | Strips chroma-key backgrounds, centers and grounds frames, and exports normalized `.png`, `.json`, `.sprite`, `.aseprite`, and `.gif` outputs. |
| `sprite_extract_palette` | Extracts 4-step material shading ramps from a reference character sheet image as `.sprite` DSL `ramp` directives. |
| `image_generate` | Generates or edits images via Nano Banana models (`nano-banana-2.1`, `nano-banana-2`, `nano-banana-2-lite`, `nano-banana-pro`) across `interactions` and `models` API modes with optional Search grounding and up to 14 reference images. |
| `music_generate` | Generates 44.1 kHz stereo music and songs via Lyria models (`lyria-3.5`, `lyria-3-clip-preview`, `lyria-3-pro-preview`) across `interactions` and `models` API modes, writing `.mp3` or `.wav` audio and optional lyrics files. |

---

## 플러그인 개발

플러그인 루트에서 `npm ci`, `npm test`, `npm run build`를 실행한다. 빌드는 TypeScript를 검사하고 배포용 `dist/`를 갱신한다. `npm run dev`로 패널을 개발할 때 Antigravity 밖에서는 `ANTIGRAVITY_APP_DATA_DIR`를 존재하는 로컬 디렉터리로 지정한다. 게임용 Vite와 패널용 Vite는 각각 실행한다.

MCP는 `node scripts/run-mcp.mjs`로 stdio에서 동작하며 Go 빌드 캐시를 사용한다. Go 검사는 `(cd mcp && go test ./...)`로 실행한다. Apple 합성은 macOS CoreAudio가 필요하다.

원본은 Daniela Petruzalek의 [agy-game-studio](https://github.com/danicat/agy-game-studio)이며 [Apache License 2.0](LICENSE)을 따른다.
