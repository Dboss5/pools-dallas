"""Generate search data from public pool pages, excluding legacy and search-result pages."""
from pathlib import Path
from html.parser import HTMLParser
import json,re
R=Path(__file__).resolve().parents[1]
services={x['slug'] for f in ['pool-services-content.json','pool-cleaning-content.json','pool-expanded-services.json'] for x in json.loads((R/'assets'/f).read_text())}|{'services'}
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,t,a):
  if t in ['script','style']:self.skip+=1
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip=max(0,self.skip-1)
 def handle_data(self,s):
  if not self.skip:self.parts.append(s)
def plain(s):
 p=Text();p.feed(s);return re.sub(r'\s+',' ',' '.join(p.parts)).strip()
items=[]
for p in sorted(R.rglob('index.html')):
 if any(x in p.parts for x in ['dist','.git','.openai']):continue
 s=p.read_text()
 if 'Frisco Pool Services' not in s or 'content="noindex' in s:continue
 slug=str(p.parent.relative_to(R));route='/' if slug=='.' else '/'+slug+'/'
 if route=='/search/':continue
 title=plain(re.search(r'<title>(.*?)</title>',s,re.S)[1]);title=re.sub(r'\s*\|\s*Frisco Pool Services$','',title)
 desc=re.search(r'<meta name="description" content="([^"]*)',s)[1];desc=plain(desc)
 main=re.search(r'<main\b[^>]*>(.*?)</main>',s,re.S)[1]
 headings=' '.join(plain(x) for x in re.findall(r'<h[1-3]\b[^>]*>(.*?)</h[1-3]>',main,re.S))
 kind='Services' if slug in services else 'Tools and guides' if slug in ['.','pool-checker'] else 'Locations'
 items.append(dict(title=title,url=route,description=desc,headings=headings,text=plain(main),category=kind))
(R/'assets/site-search-index.json').write_text(json.dumps(items,ensure_ascii=False,separators=(',',':'))+'\n')
print('Indexed',len(items),'public pool pages.')
