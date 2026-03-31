"""Helper script to download Excel files from OneDrive"""
import requests
import sys
import os

def download(url, output_path):
    try:
        r = requests.get(url, allow_redirects=True, timeout=60)
        r.raise_for_status()
        with open(output_path, 'wb') as f:
            f.write(r.content)
        return True
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    url = sys.argv[1]
    output = sys.argv[2]
    os.makedirs(os.path.dirname(output), exist_ok=True)
    success = download(url, output)
    sys.exit(0 if success else 1)
