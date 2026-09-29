import sys
from pathlib import Path

from os_ken.base.app_manager import AppManager


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def main():
    AppManager.run_apps([
        'controller.cornerstone_controller_ml'
    ])


if __name__ == "__main__":
    main()