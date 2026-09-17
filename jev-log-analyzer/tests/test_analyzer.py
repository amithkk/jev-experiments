import unittest
from types import SimpleNamespace

from jev_log_analyzer.analyzer import analyze_text, score_block, split_logs


class FakeClient:
    def __init__(self):
        self.calls = []

    def system_one(self, *, state, questions):
        self.calls.append((state, questions))
        answers = {}
        for index in range(len(questions)):
            text = state["blocks"][index]["text"]
            answers[f"block_{index}"] = SimpleNamespace(noul=0.9 if "checkout" in text else 0.1)
        return SimpleNamespace(nouls=answers)


class AnalyzerTests(unittest.TestCase):
    def test_split_preserves_content_and_line_numbers(self):
        text = "one\ntwo\nthree\nfour\n"
        blocks = split_logs(text, max_lines=2, max_chars=100)
        self.assertEqual("".join(block.text for block in blocks), text)
        self.assertEqual([(block.start_line, block.end_line) for block in blocks], [(1, 2), (3, 4)])

    def test_oversized_line_is_not_truncated(self):
        text = "abcdefghij\n"
        blocks = split_logs(text, max_lines=2, max_chars=4)
        self.assertEqual("".join(block.text for block in blocks), text)
        self.assertTrue(all(block.start_line == 1 and block.end_line == 1 for block in blocks))

    def test_batches_questions_and_ranks_matches(self):
        client = FakeClient()
        result = analyze_text(
            "checkout failures", "routine\ncheckout timeout\nroutine again\ncheckout failed\n",
            max_lines=1, batch_size=3, client=client,
        )
        self.assertEqual(len(client.calls), 2)
        self.assertEqual(result["total_blocks"], 4)
        self.assertEqual(result["matching_blocks"], 2)
        self.assertEqual([block["start_line"] for block in result["returned_blocks"]], [2, 4])
        self.assertEqual(client.calls[0][0]["investigation"], "checkout failures")

    def test_single_block_returns_probability(self):
        result = score_block("checkout failures", "checkout timeout", client=FakeClient())
        self.assertEqual(result["relevance"], 0.9)

    def test_rejects_invalid_threshold(self):
        with self.assertRaises(ValueError):
            analyze_text("problem", "log", threshold=1.2, client=FakeClient())


if __name__ == "__main__":
    unittest.main()
