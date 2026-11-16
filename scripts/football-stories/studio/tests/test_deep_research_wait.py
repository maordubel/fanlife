"""Deep research waits for Google at most WAITS_MAX times, then the film goes ahead on the archive (16.11.2026)."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from studio import deep_research as D
from studio.common import StageError


def busy(*a, **k):
    raise StageError('WRITER_BUSY', 'busy', retryable=True)


class BoundedWait(unittest.TestCase):
    def test_waits_twice_then_goes_ahead_on_the_archive(self):
        with tempfile.TemporaryDirectory() as tmp, \
                mock.patch('studio.gemini.api_key', lambda: 'k'), \
                mock.patch.object(D, '_subject', lambda ledger, brief: {'s': 1}), \
                mock.patch.object(D, '_call', busy), \
                mock.patch.dict(os.environ, {'STORIES_THIN_OK': ''}):
            for _ in range(D.WAITS_MAX):
                with self.assertRaises(StageError):
                    D.enrich({'claims': []}, {}, Path(tmp), lambda m: None)
            led = D.enrich({'claims': []}, {}, Path(tmp), lambda m: None)
            self.assertIn('research_thin', led)


if __name__ == '__main__':
    unittest.main()
