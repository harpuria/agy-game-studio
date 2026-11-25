extends SceneTree
## Bakes a sprite sheet JSON manifest into a SpriteFrames .tres for AnimatedSprite2D.
## Copy this file and aseprite_sprite_frames.gd to game/tools/, import the sheet first, then run:
##
##   godot --headless --path . --editor --import --quit
##   godot --headless --path . --script res://game/tools/bake_sprite_frames.gd -- \
##       res://game/assets/sprites/hero.json res://game/assets/sprites/hero_frames.tres

const Builder = preload("aseprite_sprite_frames.gd")


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() != 2:
		push_error("Usage: --script res://game/tools/bake_sprite_frames.gd -- <manifest.json> <out.tres>")
		quit(2)
		return
	var frames: SpriteFrames = Builder.build(args[0])
	if frames == null:
		quit(1)
		return
	var err := ResourceSaver.save(frames, args[1])
	if err != OK:
		push_error("Could not save %s (error %d)" % [args[1], err])
		quit(1)
		return
	for anim in frames.get_animation_names():
		print("%s: %d frames, %.2f fps, loop=%s" % [anim, frames.get_frame_count(anim), frames.get_animation_speed(anim), frames.get_animation_loop(anim)])
	print("Saved ", args[1])
	quit(0)
