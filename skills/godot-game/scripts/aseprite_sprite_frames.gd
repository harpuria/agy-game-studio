class_name AsepriteSpriteFrames
extends RefCounted
## Builds a SpriteFrames resource from a sprite sheet and its JSON manifest, as written by the
## game-studio MCP tools (sprite_compile, sprite_normalize) or by Aseprite's JSON export.
##
## Copy this file to game/tools/ in the game. Each frameTag becomes one animation with its
## frame order (forward, reverse or pingpong), per-frame durations and loop flag.
##
##   var frames := AsepriteSpriteFrames.build("res://game/assets/sprites/hero.json")
##   $AnimatedSprite2D.sprite_frames = frames
##   $AnimatedSprite2D.play("idle")
##
## For exported builds, bake the result to a .tres with bake_sprite_frames.gd so the JSON
## file does not need to ship with the game.


## Returns null (after push_error) if the manifest or its sheet cannot be read.
## Pass texture to use an already loaded sheet; otherwise meta.image is loaded next to the JSON.
static func build(json_path: String, texture: Texture2D = null) -> SpriteFrames:
	var text := FileAccess.get_file_as_string(json_path)
	if text.is_empty():
		push_error("AsepriteSpriteFrames: cannot read %s" % json_path)
		return null
	var data: Variant = JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY or not data.has("frames") or not data.has("meta"):
		push_error("AsepriteSpriteFrames: %s is not a sprite sheet JSON manifest" % json_path)
		return null
	var meta: Dictionary = data["meta"]

	if texture == null:
		var image_path := json_path.get_base_dir().path_join(str(meta.get("image", "")))
		texture = load(image_path) as Texture2D
		if texture == null:
			push_error("AsepriteSpriteFrames: cannot load sheet %s (run the Godot import first)" % image_path)
			return null

	# Aseprite writes frames as an array or as a dictionary keyed by file name.
	var frame_entries: Array = data["frames"] if data["frames"] is Array else (data["frames"] as Dictionary).values()
	var atlases: Array[AtlasTexture] = []
	var durations_ms: Array[float] = []
	for entry: Dictionary in frame_entries:
		var rect: Dictionary = entry["frame"]
		var atlas := AtlasTexture.new()
		atlas.atlas = texture
		atlas.region = Rect2(rect["x"], rect["y"], rect["w"], rect["h"])
		atlases.append(atlas)
		durations_ms.append(maxf(1.0, float(entry.get("duration", 100))))
	if atlases.is_empty():
		push_error("AsepriteSpriteFrames: %s has no frames" % json_path)
		return null

	var tags: Array = meta.get("frameTags", [])
	if tags.is_empty():
		tags = [{"name": "default", "from": 0, "to": atlases.size() - 1, "direction": "forward"}]

	var sprite_frames := SpriteFrames.new()
	var has_default_tag := false
	for tag: Dictionary in tags:
		var anim := str(tag.get("name", ""))
		var first := int(tag.get("from", tag.get("fromFrame", 0)))
		var last := int(tag.get("to", tag.get("toFrame", first)))
		if anim.is_empty() or first < 0 or last < first or last >= atlases.size():
			push_error("AsepriteSpriteFrames: skipping tag %s with frames %d..%d" % [anim, first, last])
			continue

		var order: Array[int] = []
		for i in range(first, last + 1):
			order.append(i)
		match str(tag.get("direction", "forward")):
			"reverse":
				order.reverse()
			"pingpong":
				for i in range(last - 1, first, -1):
					order.append(i)

		# repeat "1" (Aseprite) or loop "once" (game-studio) plays the animation a single time.
		var plays_once := str(tag.get("repeat", "")) == "1" or str(tag.get("loop", "")) == "once"
		if anim == "default":
			has_default_tag = true
			sprite_frames.clear("default")
		else:
			sprite_frames.add_animation(anim)
		sprite_frames.set_animation_loop(anim, not plays_once)
		# The first frame's duration sets the base speed; other frames scale relative to it.
		var base_ms := durations_ms[order[0]]
		sprite_frames.set_animation_speed(anim, 1000.0 / base_ms)
		for i in order:
			sprite_frames.add_frame(anim, atlases[i], durations_ms[i] / base_ms)

	if not has_default_tag and sprite_frames.get_animation_names().size() > 1:
		sprite_frames.remove_animation("default")
	return sprite_frames
