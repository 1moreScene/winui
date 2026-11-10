"""Run a reference extractor with stable, transactional generated-file writes."""
import io
import os
from pathlib import Path
import runpy
import shutil
import sys
import tempfile
import time
import xml.etree.ElementTree as ET


def write_generated(path, data):
    path = Path(path)
    if path.exists() and path.read_bytes() == data:
        return len(data)
    fd, temporary = tempfile.mkstemp(prefix='.' + path.name + '.', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
        for attempt in range(8):
            try:
                os.replace(temporary, path)
                return len(data)
            except OSError as error:
                if error.errno not in (13, 22) and getattr(error, 'winerror', None) not in (5, 32, 33):
                    raise
                if attempt == 7:
                    raise
                time.sleep(0.05 * (attempt + 1))
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def write_text(path, data, encoding=None, errors=None, newline=None):
    if newline is None:
        newline = os.linesep
    if newline != '\n':
        data = data.replace('\n', newline)
    write_generated(path, data.encode(encoding or 'utf-8', errors or 'strict'))
    return len(data)


def copyfile(source, target, *, follow_symlinks=True):
    if os.path.abspath(source) == os.path.abspath(target):
        raise shutil.SameFileError(source)
    write_generated(target, Path(source).read_bytes())
    return target


original_xml_write = ET.ElementTree.write


def xml_write(tree, target, *args, **kwargs):
    if hasattr(target, 'write'):
        return original_xml_write(tree, target, *args, **kwargs)
    stream = io.StringIO() if kwargs.get('encoding') == 'unicode' else io.BytesIO()
    original_xml_write(tree, stream, *args, **kwargs)
    data = stream.getvalue()
    write_generated(target, data.encode('utf-8') if isinstance(data, str) else data)


def main():
    Path.write_text = write_text
    Path.write_bytes = lambda path, data: write_generated(path, data)
    shutil.copyfile = copyfile
    ET.ElementTree.write = xml_write
    script, *arguments = sys.argv[1:]
    sys.argv = [script, *arguments]
    runpy.run_path(script, run_name='__main__')


if __name__ == '__main__':
    main()
