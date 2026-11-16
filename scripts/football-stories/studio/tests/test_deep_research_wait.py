"""Deep research waits for Google at most WAITS_MAX times, then the film goes ahead on the archive (16.11.2026)."""
import pytest

from studio import deep_research as D
from studio.common import StageError


def test_bounded_wait(tmp_path, monkeypatch):
    monkeypatch.setattr('studio.gemini.api_key', lambda: 'k')
    monkeypatch.setattr(D, '_subject', lambda ledger, brief: {'s': 1})
    monkeypatch.delenv('STORIES_THIN_OK', raising=False)

    def busy(*a, **k):
        raise StageError('WRITER_BUSY', 'busy', retryable=True)
    monkeypatch.setattr(D, '_call', busy)
    for _ in range(D.WAITS_MAX):
        with pytest.raises(StageError):
            D.enrich({'claims': []}, {}, tmp_path, lambda m: None)
    led = D.enrich({'claims': []}, {}, tmp_path, lambda m: None)
    assert 'research_thin' in led
