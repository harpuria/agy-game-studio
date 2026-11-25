---
name: phaser-web
description: Phaser 웹 템플릿 파생 게임의 장면, 웹 입력, 에셋 로딩, standalone 또는 CrazyGames 실행과 배포 검증에 사용한다.
license: Apache-2.0
---

# Phaser Web

게임의 `AGENTS.md`와 `docs/game/README.md`에서 시작한다. 설정은 `src/config/game.ts`, 규칙·저장 스키마·문구·에셋 목록은 `src/game/`에 둔다. 프레임워크나 플랫폼 연동을 수정할 때는 `docs/ARCHITECTURE.md`와 실제 서비스 Adapter를 읽는다.

- 게임 루트에서 `.nvmrc`에 맞춰 `npm ci` 후 `npm run dev:standalone`으로 데모 또는 변경한 장면을 연다. CrazyGames SDK 작업에는 `docs/CRAZYGAMES.md`와 SDK 개발 모드를 따른다.
- PNG와 WAV를 게임의 `public/assets/` 아래에 두고 `src/game/assets.ts`의 키와 `queueAssets`에 등록한다. 균일한 시트라면 loader의 현재 경로에 맞춰 `load.spritesheet('hero', 'hero.png', { frameWidth: 32, frameHeight: 32 })`로 읽고, 로딩 후 `this.anims.generateFrameNumbers('hero', { start: 0, end: 3 })` 결과로 애니메이션을 등록한다. 크기·프레임 범위는 생성 결과에 맞춘다.
- `npm run check`로 검사한다. UI·입력 변경에는 `npm run test:e2e`, 자체 호스팅 배포에는 `npm run build:standalone`, CrazyGames 제출에는 `npm run build:crazygames`를 사용한다. 브라우저와 플랫폼을 명시해 결과를 기록한다.
