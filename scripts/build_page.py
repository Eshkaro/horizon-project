"""Bundle local assets into one HTML file for reliable file:// use."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build_page():
    html = (ROOT / 'index.template.html').read_text()
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (ROOT / 'style.css').read_text() + '</style>')
    html = html.replace('<link rel="stylesheet" href="benchmarks.css">', '<style>' + (ROOT / 'benchmarks.css').read_text() + '</style>')
    for name in ['portfolio-data.js', 'app.js', 'benchmarks-data.js', 'benchmarks.js']:
        script = (ROOT / name).read_text().replace('</script', '<\\/script')
        html = html.replace('<script src="' + name + '"></script>', '<script>' + script + '</script>')
    (ROOT / 'index.html').write_text(html)


if __name__ == '__main__':
    build_page()
