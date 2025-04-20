#!/usr/bin/env python3

import streamlit.web.cli as stcli
import sys
from pathlib import Path

if __name__ == "__main__":
    sys.argv = ["streamlit", "run", str(Path(__file__).parent / "mailogy" / "app.py"), "--server.headless", "true", "--server.enableCORS", "false"]
    sys.exit(stcli.main()) 