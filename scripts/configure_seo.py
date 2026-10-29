"""Set the real production origin and generate a sitemap for converted pool pages."""
import argparse,json,re
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree.ElementTree import Element,SubElement,tostring
parser=argparse.ArgumentParser();parser.add_argument('--origin',required=True);args=parser.parse_args()
u=urlsplit(args.origin)
if u.scheme!='https' or not u.netloc or u.username or u.password or u.path not in ('','/') or u.query or u.fragment:
 parser.error('--origin must be a plain HTTPS origin, such as https://your-domain.com')
origin=args.origin.rstrip('/');root=Path(__file__).resolve().parents[1]
routes=['/','/services/','/service-areas/','/pool-checker/']+['/'+d['slug']+'/' for d in json.loads((root/'assets/pool-services-content.json').read_text())]+['/'+d['slug']+'/' for d in json.loads((root/'assets/pool-areas-content.json').read_text())]
routes=list(dict.fromkeys(routes+['/'+d['slug']+'/' for d in json.loads((root/'assets/pool-cleaning-content.json').read_text())]))
for route in routes:
 path=root/route.strip('/')/'index.html' if route!='/' else root/'index.html'
 s=path.read_text();canonical=f'<link rel="canonical" href="{origin}{route}">'
 if re.search(r'<link rel="canonical"[^>]*>',s):s=re.sub(r'<link rel="canonical"[^>]*>',canonical,s)
 else:s=s.replace('</head>',canonical+'</head>')
 s=re.sub(r'<meta property="og:url"[^>]*>','',s).replace('</head>',f'<meta property="og:url" content="{origin}{route}"></head>')
 path.write_text(s)
xml=Element('urlset',xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
for route in routes:SubElement(SubElement(xml,'url'),'loc').text=origin+route
(root/'sitemap.xml').write_bytes(b'<?xml version="1.0" encoding="UTF-8"?>'+tostring(xml,encoding='utf-8'))
robots=root/'robots.txt';text=re.sub(r'^Sitemap:.*\n?','',robots.read_text(),flags=re.M)
robots.write_text(text.rstrip()+'\nSitemap: '+origin+'/sitemap.xml\n')
print('Configured canonicals and sitemap for',len(routes),'converted pages.')
