# Godot PC

InputManager에 게임 액션을 등록하고 WindowManager로 화면 옵션을 변경한다. 일시정지·설정·종료는 기존 메뉴와 대화상자를 사용한다. 업적·스토어는 App.store에 연결한다. Steam 작업은 docs/STEAM.md, export·서명은 docs/DISTRIBUTION.md를 따른다.

게임 루트에서 `bash tools/validate.sh`를 실행한다. PATH 밖의 엔진은 GODOT 변수로 지정한다. 스크립트의 최종 요약과 실패한 장면의 로그를 확인한다. OS별 바이너리·스토어 기능은 해당 타깃의 실행 결과를 별도로 기록한다.
