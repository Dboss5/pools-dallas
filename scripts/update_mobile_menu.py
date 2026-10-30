"""Apply the shared Frisco mobile menu to every current pool page."""
from pathlib import Path
from html import escape
import json,re
R=Path(__file__).resolve().parents[1]
C=json.loads((R/'assets/pool-service-catalog.json').read_text());L=json.loads((R/'assets/frisco-local-content.json').read_text())
def a(slug,label):return '<a href="/'+slug+'/">'+escape(label)+'</a>' if slug else '<a href="/">'+escape(label)+'</a>'
def group(title,items,name):return '<details class="mobile-menu-group" name="'+name+'" data-menu-group="'+name+'"><summary><span>'+title+'</span><span class="mobile-group-count">'+str(len(items))+'</span><span class="mobile-group-mark" aria-hidden="true">+</span></summary><div class="mobile-group-links">'+''.join(a(slug,label) for slug,label in items)+'</div></details>'
svg='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>'
menu='''<dialog id="mobileMenu" class="menu-drawer pool-mobile-menu" aria-labelledby="mobileTitle"><div class="mobile-menu-top"><div class="mobile-menu-brand"><a href="/" aria-label="Frisco Pool Services home"><img src="/assets/frisco-pool-logo.svg" alt="Frisco Pool Services" width="600" height="200"></a><button id="menuClose" class="mobile-menu-close" type="button" aria-label="Close navigation menu">Close <span aria-hidden="true">×</span></button></div><h2 id="mobileTitle">Find your next step.</h2><form class="mobile-menu-search" action="/search/" method="get" role="search"><label class="mobile-sr-only" for="mobileSearchInput">Search pool services and Frisco guides</label><input id="mobileSearchInput" name="q" type="search" maxlength="160" placeholder="Search services or areas" autocomplete="off"><button type="submit" aria-label="Search website">'''+svg+'''</button></form></div><div class="mobile-menu-content"><nav aria-label="Mobile navigation"><div class="mobile-menu-primary">'''
menu+=''.join(a(slug,label) for slug,label in [('', 'Home'),('services','All 21 services'),('pool-cleaning','Pool cleaning'),('pool-checker','Photo checker'),('frisco-neighborhoods','Frisco areas'),('service-areas','All service areas')])+'</div><h3 class="mobile-menu-label">Service guides</h3>'
labels={'Maintenance':'Maintenance & cleaning','Repairs':'Equipment & repairs','Upgrades':'Upgrades & controls','Remodeling':'Remodeling & surfaces','Specialized':'Inspections & specialty'}
for category,title in labels.items():
 items=[(x['slug'],x['name']) for x in C if x['category']==category]
 if category=='Maintenance':items += [('green-pool-cleaning','Green pool cleanup'),('pool-filter-cleaning','Filter cleaning'),('saltwater-pool-maintenance','Saltwater maintenance'),('one-time-pool-cleaning','One-time cleaning')]
 menu+=group(title,items,'mobile-service-groups')
menu+='<h3 class="mobile-menu-label">Closer to your Frisco home</h3>'
menu+=group('County guides',[(x['slug'],x['name']) for x in L if x['kind']=='County'],'mobile-location-groups')
menu+=group('Neighborhood guides',[(x['slug'],x['name']) for x in L if x['kind']=='Neighborhood'],'mobile-location-groups')
menu+='<div class="mobile-menu-help"><a href="/#how">How service works</a><a href="/#faq">Pool service FAQs</a></div></nav></div><div class="mobile-menu-contact"><div><a class="mobile-call" href="tel:+19457773345">Call the team</a><a class="mobile-text" href="sms:+19457773345">Text the team</a></div><p>945-777-3345 · Frisco, Texas</p></div></dialog>'
count=0
for p in R.rglob('*.html'):
 if any(x in p.parts for x in ['dist','.git','.openai']):continue
 s=p.read_text()
 if 'Frisco Pool Services' not in s:continue
 s,n=re.subn(r'<dialog id="mobileMenu".*?</dialog>',lambda m:menu,s,count=1,flags=re.S)
 assert n==1,p
 p.write_text(s);count+=1
print('Updated mobile menu on',count,'pool pages.')
