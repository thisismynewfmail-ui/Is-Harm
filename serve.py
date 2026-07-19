#!/usr/bin/env python3
"""
Local network server for THE RAPE GANG INQUIRY case-file site.

Serves the site's static files (HTML, CSS, JS, JSON) over HTTP on port 5762,
bound to all interfaces so it is reachable from other devices on the same LAN.
The multi-page site loads assets/data.json via fetch(), which the file://
protocol blocks — so it must be served over HTTP. This is that server.

    python3 serve.py            # serve on 0.0.0.0:5762
    python3 serve.py --port N   # override the port

Then open http://localhost:5762/  (or http://<this-machine-ip>:5762/ on the LAN).
Press Ctrl+C to stop.
"""
import argparse
import http.server
import os
import socket
import socketserver
import sys

DEFAULT_PORT = 5762
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    """Static handler rooted at the site directory, with sane dev headers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
    }

    def end_headers(self):
        # No caching in dev so edits show up on refresh.
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write('  %s - %s\n' % (self.address_string(), fmt % args))


def lan_ip():
    """Best-effort primary LAN address (no traffic actually sent)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    ap = argparse.ArgumentParser(description='Serve the case-file site on the local network.')
    ap.add_argument('--port', type=int, default=DEFAULT_PORT, help='port to listen on (default 5762)')
    ap.add_argument('--host', default='0.0.0.0', help='interface to bind (default 0.0.0.0 = all)')
    args = ap.parse_args()

    if not os.path.exists(os.path.join(ROOT, 'index.html')):
        sys.exit('error: index.html not found next to serve.py (%s)' % ROOT)

    try:
        httpd = Server((args.host, args.port), Handler)
    except OSError as e:
        sys.exit('error: could not bind %s:%d — %s\n'
                 'Is the port already in use? Try: python3 serve.py --port <other>' % (args.host, args.port, e))

    ip = lan_ip()
    line = '=' * 64
    print(line)
    print('  THE RAPE GANG INQUIRY — case file  ·  serving on port %d' % args.port)
    print(line)
    print('  On this machine : http://localhost:%d/' % args.port)
    print('  On the network  : http://%s:%d/' % (ip, args.port))
    print('  Serving folder  : %s' % ROOT)
    print('  Stop the server : Ctrl+C')
    print(line)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n  Stopping server. Goodbye.')
    finally:
        httpd.server_close()


if __name__ == '__main__':
    main()
