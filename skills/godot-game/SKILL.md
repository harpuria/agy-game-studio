---
name: godot-game
description: Godot 모바일 또는 PC 템플릿의 GDScript 장면, 저장, 입력, 오디오, 플랫폼 서비스와 네이티브 실행을 구현하거나 검증할 때 사용한다.
license: Apache-2.0
---

# Godot 게임

게임 루트의 `AGENTS.md`, `docs/CODEBASE_MAP.md`와 해당 작업의 연결 문서를 읽는다. 템플릿에 고정된 Godot Standard 버전을 사용한다. 게임별 장면·규칙·저장 마이그레이션은 `game/`에 두고 `app/init_script`로 연결한다. 이름·시작 장면 등 `config/game.cfg`의 설정을 바꿨다면 게임 루트에서 `godot --headless --path . --script res://tools/configure.gd`를 실행하고 생성된 변경을 확인한다.

PNG 시트는 게임 에셋 폴더에 import하고 AnimatedSprite2D의 SpriteFrames에서 시트를 프레임 크기에 맞춰 나눈다. 태그별 프레임 순서와 재생 속도를 원본과 대조한다. WAV는 AudioStream으로 import한 뒤 템플릿의 AudioManager에 연결한다.

- Android/iOS용 게임과 광고·결제 변경은 [모바일 절차](references/mobile.md)를 따른다.
- 데스크톱·Steam Deck 게임과 입력 재설정·창 모드 변경은 [PC 절차](references/pc.md)를 따른다.

에디터에서 F5 또는 게임 루트에서 `godot --path .`로 시작 장면을 실행한다. 시각·입력 확인과 headless 검사 결과를 각각 기록한다.
