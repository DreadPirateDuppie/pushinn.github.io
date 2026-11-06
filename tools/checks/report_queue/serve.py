import http.server, socketserver, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_GET(s):
        p = s.path.split('?')[0]
        if p == '/stub.js':
            b = open(os.path.join(HERE, 'stub.js'), 'rb').read(); ct = 'application/javascript'
        elif p in ('/admin', '/admin.html'):
            h = open(os.path.join(ROOT, 'admin.html')).read()
            h = h.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script src="/stub.js"></script>')
            h = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)[^>]*>', '', h)
            b = h.encode(); ct = 'text/html'
        else:
            return super().do_GET()
        s.send_response(200); s.send_header('Content-Type', ct); s.send_header('Content-Length', str(len(b))); s.end_headers(); s.wfile.write(b)
    def log_message(s, *a): pass
socketserver.TCPServer.allow_reuse_address = True
socketserver.TCPServer(('127.0.0.1', 8361), H).serve_forever()
