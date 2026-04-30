"""
Wrapper entry point for PyInstaller.
This script correctly sets up the package context and runs the proxy.
"""
import os
import sys

# Add the tg-ws-proxy-main directory to sys.path
# so that 'proxy' is importable as a package
_root = os.path.dirname(os.path.abspath(__file__))
if _root not in sys.path:
    sys.path.insert(0, _root)

# Import the proxy module and call its main() function
from proxy.tg_ws_proxy import main

if __name__ == '__main__':
    main()
