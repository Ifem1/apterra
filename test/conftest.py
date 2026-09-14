"""Windows compatibility for GenLayer Test 0.30.0rc2's direct stdin loader.

That runner unlinks a tempfile immediately after dup2'ing it onto fd 0. POSIX
permits unlinking an open file; Windows raises WinError 32. Defer only that
specific unlink until the runner restores stdin during its normal VM teardown.
No VM, calldata, contract, or assertion behavior is replaced.
"""

import os

if os.name == "nt":
    from gltest.direct import loader as _loader
    from gltest.direct.vm import VMContext as _VMContext

    # The RC loader imports os inside the injection function rather than as a
    # module attribute; expose the shared module for the narrowly scoped patch.
    _loader.os = os

    _original_inject = _loader._inject_message_to_fd0
    _original_cleanup = _VMContext._cleanup_after_deactivate
    _original_unlink = os.unlink

    def _defer_locked_stdin_unlink(vm):
        paths = getattr(vm, "_apterra_deferred_stdin_paths", None)
        if paths is None:
            paths = []
            vm._apterra_deferred_stdin_paths = paths

        def _unlink_or_defer(path, *args, **kwargs):
            try:
                return _original_unlink(path, *args, **kwargs)
            except PermissionError as error:
                if error.winerror != 32:
                    raise
                paths.append(path)

        _loader.os.unlink = _unlink_or_defer
        try:
            return _original_inject(vm)
        finally:
            _loader.os.unlink = _original_unlink

    def _cleanup_deferred_stdin(vm):
        try:
            _original_cleanup(vm)
        finally:
            for path in getattr(vm, "_apterra_deferred_stdin_paths", []):
                try:
                    _original_unlink(path)
                except FileNotFoundError:
                    pass
            vm._apterra_deferred_stdin_paths = []

    _loader._inject_message_to_fd0 = _defer_locked_stdin_unlink
    _VMContext._cleanup_after_deactivate = _cleanup_deferred_stdin

# Contract code reads its deterministic block timestamp from the raw message.
# Keep that view synchronized with the direct runner's warp clock on every OS;
# otherwise expiry tests depend on the runner host's wall clock instead of the
# test's explicit timestamp.
_original_warp = _VMContext.warp

def _warp_and_sync_raw_message(vm, timestamp):
    _original_warp(vm, timestamp)
    message = __import__("sys").modules.get("genlayer.message")
    raw = getattr(message, "raw", None) if message is not None else None
    if isinstance(raw, dict):
        raw["datetime"] = timestamp

_VMContext.warp = _warp_and_sync_raw_message
