import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "examples"))
from generate_noisy_logs import generate  # noqa: E402


class DemoFixtureTests(unittest.TestCase):
    def test_committed_fixture_matches_generator_and_has_scattered_incident(self):
        generated = generate()
        self.assertEqual(generated, (ROOT / "examples" / "noisy-checkout.log").read_text())
        lines = generated.splitlines()
        self.assertEqual(len(lines), 240)
        self.assertIn("max_connections=4", lines[74])
        self.assertIn("status=503", lines[85])
        self.assertIn("status=503", lines[182])
        self.assertIn("rollback started", lines[216])


if __name__ == "__main__":
    unittest.main()
