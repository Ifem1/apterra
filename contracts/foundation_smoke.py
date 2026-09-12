# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class FoundationSmoke(gl.Contract):
    """Gate 0 only: proves the installed direct VM can deploy, write, and read."""

    value: u256

    def __init__(self):
        self.value = 0

    @gl.public.write
    def set_value(self, value: u256) -> None:
        self.value = value

    @gl.public.view
    def get_value(self) -> u256:
        return self.value
