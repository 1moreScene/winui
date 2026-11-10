"""Regression checks for accidental permission-gate bypasses, in isolated files."""
import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('license_review', Path(__file__).with_name('check-resource-licenses.py'))
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)

class ResourceLicenseGate(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.original_root = review.ROOT
        review.ROOT = self.root
        for directory in ['third_party', 'gallery/public/licenses', 'packages/winui-wasm/src/assets', 'third_party/icon-fonts', 'tools']:
            (self.root / directory).mkdir(parents=True, exist_ok=True)
        (self.root / 'LICENSE').write_text('test copyright and permission\n')
        (self.root / 'THIRD_PARTY_NOTICES.txt').write_text('test copyright and permission\n')
        (self.root / 'gallery/public/licenses/THIRD_PARTY_NOTICES.txt').write_text('test copyright and permission\n')
        self.resources = {'files': [], 'components': [{'id': 'project', 'license': 'MIT'}],
                          'notices': {'LICENSE': hashlib.sha256((self.root / 'LICENSE').read_bytes()).hexdigest()},
                          'unresolved': [{'id': 'SDK-PREVIEW-001', 'summary': 'No redistribution grant', 'requiredResolution': 'Use independently licensed inputs'}]}
        self.dependencies = {'lockfiles': {}, 'components': []}
        self.save()

    def tearDown(self):
        review.ROOT = self.original_root
        self.temp.cleanup()

    def save(self):
        for name, data in [('resource-manifest.json', self.resources), ('dependency-licenses.json', self.dependencies)]:
            value = json.dumps(data)
            (self.root / 'third_party' / name).write_text(value)
            (self.root / 'gallery/public/licenses' / name).write_text(value)

    def test_local_integrity_does_not_approve_redistribution(self):
        self.assertEqual(review.verify(False)[2], [])
        self.assertTrue(any('SDK-PREVIEW-001' in error for error in review.verify(True)[2]))

    def test_removing_a_finding_does_not_approve_a_restricted_extractor(self):
        self.resources['unresolved'] = []
        self.save()
        (self.root / 'tools/extract-example.py').write_text("sdk='.nuget/packages/microsoft.windowsappsdk.winui/2.3.10-experimental/lib/native/Microsoft.UI/Themes/generic.xaml'")
        self.assertTrue(any('Restricted preview' in error for error in review.verify(True)[2]))

    def test_clean_finding_list_still_requires_mit_generation_evidence(self):
        self.resources['unresolved'] = []
        self.save()
        self.assertTrue(any('MIT resource provenance verification failed' in error for error in review.verify(True)[2]))

    def test_new_media_and_removed_copyright_fail(self):
        (self.root / 'gallery/public/unreviewed.woff').write_bytes(b'unreviewed')
        self.assertTrue(any('Unreviewed media' in error for error in review.verify(False)[2]))
        (self.root / 'LICENSE').unlink()
        self.assertTrue(any('Missing or unsafe' in error for error in review.verify(False)[2]))

    def test_source_only_copyright_is_not_sufficient(self):
        (self.root / 'THIRD_PARTY_NOTICES.txt').write_text('missing the real copyright')
        self.assertTrue(any('Full license text missing' in error for error in review.verify(False)[2]))

    def test_runtime_mpl_and_unreviewed_dependency_licenses_require_review(self):
        for license in ['GPL-3.0-only', 'MPL-2.0', None]:
            self.dependencies['components'] = [{'ecosystem': 'npm', 'name': 'new-runtime', 'dev': False, 'license': license, 'notices': []}]
            self.save()
            self.assertTrue(review.verify(False)[2])

if __name__ == '__main__':
    unittest.main()
