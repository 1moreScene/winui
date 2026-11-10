import errno
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import generate


class GeneratedFiles(unittest.TestCase):
    def test_unchanged_content_does_not_replace_a_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.json'
            path.write_bytes(b'original')
            with patch('generate.os.replace') as replace:
                generate.write_generated(path, b'original')
                replace.assert_not_called()

    def test_transient_windows_error_is_retried(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.json'
            path.write_bytes(b'original')
            replace = generate.os.replace
            with patch('generate.os.replace', side_effect=[OSError(errno.EINVAL, 'file busy'), None]) as mocked:
                # Delegate the successful attempt to the actual filesystem.
                def attempt(source, target):
                    if mocked.call_count == 1:
                        self.assertEqual(path.read_bytes(), b'original')
                        raise OSError(errno.EINVAL, 'file busy')
                    replace(source, target)
                mocked.side_effect = attempt
                generate.write_generated(path, b'changed')
            self.assertEqual(path.read_bytes(), b'changed')

    def test_permanent_failure_preserves_old_file_and_removes_temporary(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.json'
            path.write_bytes(b'original')
            with patch('generate.os.replace', side_effect=OSError(errno.ENOSPC, 'disk full')):
                with self.assertRaises(OSError):
                    generate.write_generated(path, b'changed')
            self.assertEqual(path.read_bytes(), b'original')
            self.assertEqual(list(Path(directory).iterdir()), [path])


if __name__ == '__main__':
    unittest.main()
