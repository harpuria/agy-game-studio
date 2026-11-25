---
name: vibe-game-developer
description: Phaser 웹, Godot 모바일·PC 게임을 새로 만들거나 기존 게임을 수정할 때 템플릿을 식별하고 기획, 구현, 에셋 제작, 검증 스킬을 선택한다.
license: Apache-2.0
---

# 게임 프로젝트 선택

1. 기존 게임에서는 프로젝트의 `AGENTS.md`와 게임 문서에 기록된 템플릿 출처·버전을 읽는다. Phaser는 `package.json`의 phaser 의존성과 npm scripts를 확인한다. Godot는 `project.godot`, `docs/CODEBASE_MAP.md`, export preset과 서비스 구성을 함께 읽는다. 이름을 바꾼 파생 저장소도 같은 절차를 따른다.
2. 새 웹 게임은 [Phaser Web](https://github.com/harpuria/phaser-web-template), Android/iOS는 [Godot Mobile](https://github.com/harpuria/godot-mobile-template), 네이티브 데스크톱은 [Godot PC](https://github.com/harpuria/godot-pc-template)의 `docs/template/APPLYING.md`를 따라 시작한다. 기존 게임에 적용하거나 버전을 올릴 때도 해당 절차를 사용한다. 대상이 겹치고 프로젝트만으로 판단할 수 없으면 배포 대상을 확인한다.
3. 기획 작업에는 `game-design`을 사용한다. 합의한 조작·게임 루프·성공 조건을 Phaser의 `docs/game/` 또는 Godot 게임의 `docs/`에 기록한다.
4. Phaser 구현·검증은 `phaser-web`, Godot 구현·검증은 `godot-game`을 따른다. 실제 게임 저장소의 지침과 고정 버전을 우선한다.
5. 필요한 에셋만 준비한다. 스프라이트는 `sprite-design`, 효과음은 `procedural-sfx`, 음악은 `procedural-music`을 사용한다. 생성형 이미지나 음악을 요청하면 `nano-banana` 또는 `lyria`를 사용한다. MCP에 넘기는 입력·출력 경로를 게임 루트 기준으로 확인하고 절대 경로로 전달한다. 대상 장면에서 애니메이션과 소리를 확인한다.
6. Phaser 화면 캡처·주석·리플레이 요청에는 `game-dev-studio`를 사용한다. Godot는 해당 템플릿의 네이티브 실행과 테스트 경로로 검증한다. 보고서에는 실행한 검사와 기기·스토어 확인 범위를 적는다.
