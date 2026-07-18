
from dotenv import load_dotenv
import copy
import os

load_dotenv()


class Settings:
    def __init__(self):
        self.COLORS = [
            "🔴", "🟠", "🟡", "🟢", "🔵",
            "🟣", "🟤", "⚫", "⚪", "🟥",
            "🟧", "🟨", "🟩", "🟦", "🟪",
            "🟫", "⬛", "⬜", "🔶", "🔷",
        ]

        self._color_index = 0

        self.GEMINI_KEYS = [
            os.getenv("GEMINI_API_KEY1"),
            os.getenv("GEMINI_API_KEY2"),
            os.getenv("GEMINI_API_KEY3"),
            os.getenv("GEMINI_API_KEY4"),
            os.getenv("GEMINI_API_KEY5"),
            os.getenv("GEMINI_API_KEY6"),
            os.getenv("GEMINI_API_KEY7"),
            os.getenv("GEMINI_API_KEY8")
        ]

        self.GROQ_KEYS = [
            os.getenv("GROQ_API_KEY1"),
            os.getenv("GROQ_API_KEY2"),
            os.getenv("GROQ_API_KEY3"),
            os.getenv("GROQ_API_KEY4"),
            os.getenv("GROQ_API_KEY5")
        ]

        self.gemini_template = {
            "model_name": "gemini",
            "litellm_params": {
                "model": "gemini/gemini-3-flash-preview",
                "api_key": None,
                "rpm": 2,
                "weight": 1,
            },
            "model_info": {"id": None},
        }

        self.groq_template = {
            "model_name": "groq",
            "litellm_params": {
                "model": "groq/llama-3.3-70b-versatile",
                "api_key": None,
                "rpm": 2,
                "weight": 1,
            },
            "model_info": {"id": None},
        }

        self.gemini_model_list = self._build_models(
            self.gemini_template,
            self.GEMINI_KEYS,
            "Gemini",
        )

        self.groq_model_list = self._build_models(
            self.groq_template,
            self.GROQ_KEYS,
            "Groq",
        )

    def _next_color(self):
        color = self.COLORS[self._color_index % len(self.COLORS)]
        self._color_index += 1
        return color

    def _build_models(self, template, api_keys, provider):
        models = []

        for i, key in enumerate(api_keys, start=1):
            if not key:
                continue
            key,provider_person=key.split(" ")
            model = copy.deepcopy(template)
            model["litellm_params"]["api_key"] = key
            model["model_info"]["id"] = f"{self._next_color()} {provider_person} {i}"

            models.append(model)

        return models