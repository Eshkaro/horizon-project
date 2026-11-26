"""Build a standalone matcher HTML page; no third-party dependencies."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def build_matcher_page():
    html=(ROOT/'matcher.template.html').read_text()
    html=html.replace('<link rel="stylesheet" href="matcher.css">','<style>'+(ROOT/'matcher.css').read_text()+'</style>')
    for name in ['matcher-data.js','matcher-engine.js','matcher.js']:
        content=('window.MATCHER_DATA='+(ROOT/'data/matcher-corpus.json').read_text()+';' if name=='matcher-data.js' else (ROOT/name).read_text()).replace('</script','<\\/script')
        html=html.replace('<script src="'+name+'"></script>','<script>'+content+'</script>')
    (ROOT/'matcher.html').write_text(html)


if __name__=='__main__':
    build_matcher_page()
