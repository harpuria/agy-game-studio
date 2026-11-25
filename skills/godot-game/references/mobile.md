# Godot Mobile

광고는 App.ads, 결제는 App.billing을 통해 접근한다. 화면 방향, 터치 조작, 게임 서비스와 대상 스토어를 확인한다. 네이티브 작업은 게임 저장소의 docs/ANDROID_SERVICES.md와 docs/STORE_RELEASE.md를 따른다.

게임 루트에서 import 후 변경에 해당하는 시나리오를 실행한다.

```sh
godot --headless --path . --editor --import --quit
godot --headless --path . --scene res://tests/integration.tscn
godot --headless --path . --scene res://tests/integration.tscn -- --disabled
godot --headless --path . --scene res://tests/integration.tscn -- --native
```

각 로그의 INTEGRATION 검사 수와 실패 수를 확인한다. 계정·결제·광고·기기 방향은 해당 스토어 빌드와 기기에서 확인한 결과만 기록한다.
