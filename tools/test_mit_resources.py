"""MIT migration regression checks: tampering, determinism and theme semantics."""
from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from verify_mit_resources import verify
from sdk_resource_reader import brush, find

class MitResources(unittest.TestCase):
    def test_verified_chain_and_missing_input(self):
        verify(ROOT)
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            (target/'references').mkdir()
            shutil.copy(ROOT/'references/mit-xaml-sources.json', target/'references')
            with self.assertRaises(OSError):
                verify(target)

    def test_changed_palette_is_rejected(self):
        # Minimal isolated chain still uses the real immutable source inputs.
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            shutil.copytree(ROOT/'references/mit-xaml', target/'references/mit-xaml')
            shutil.copytree(ROOT/'references/mit-xaml-generated', target/'references/mit-xaml-generated')
            for name in ['mit-xaml-sources.json','mit-xaml-generation.json','mit-palette-generation.json']:
                shutil.copy(ROOT/'references'/name, target/'references'/name)
            proof = json.loads((ROOT/'references/mit-palette-generation.json').read_text())
            for entry in proof['outputs']:
                shutil.copy(ROOT/entry['path'], target/entry['path'])
            (target/proof['outputs'][0]['path']).write_text('{}')
            with self.assertRaisesRegex(AssertionError, 'Modified MIT input'):
                verify(target)

    def test_offline_generation_is_deterministic(self):
        proof = json.loads((ROOT/'references/mit-palette-generation.json').read_text())
        names = ['references/mit-xaml-generated/generic.xaml','references/mit-xaml-generation.json','references/mit-palette-generation.json'] + [x['path'] for x in proof['outputs']]
        original = {name:(ROOT/name).read_bytes() for name in names}
        for script in ['build-mit-resource-dictionary.py','generate-mit-palettes.py']:
            subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/generate.py'),str(ROOT/'tools'/script)], check=True, capture_output=True)
        self.assertEqual(original, {name:(ROOT/name).read_bytes() for name in names})

    def test_theme_precedence_and_platform_roles(self):
        self.assertEqual(find('Default','TreeViewItemMinHeight').text, '28')
        self.assertEqual(brush('Light','CalendarViewCalendarItemRevealBackground')['color'], '#FFFFFF00')
        self.assertEqual(brush('Light','LoopingSelectorSelectionBackgroundThemeBrush')['color'], '#0078D4FF')
        self.assertEqual(brush('HighContrast','RepeatButtonForegroundPressed')['color'], '#FFFFFFFF')

if __name__ == '__main__':
    unittest.main()
