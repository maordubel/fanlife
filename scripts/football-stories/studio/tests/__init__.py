"""Studio tests. The story room (studio/story_room.py) is one more model call before the scripts; the writer tests feed
`call_model` canned answers in order, so the room stays shut here unless a test opens it (studio/tests/test_story_engine.py)."""
import os

os.environ.setdefault('STORIES_STORY_ROOM', '0')
