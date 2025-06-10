import json
import ollama
from ..models.ai_analysis import AIAnalysis

LOCAL_LLM_MODEL = "gemma2:2b"

PROMPT_TEMPLATE = """
You are a highly intelligent meeting analysis assistant. Your primary function is to meticulously analyze the meeting transcription provided and extract specific, structured information.

Analyze the following transcription:
---
{transcription_text}
---

Your response MUST be a single, valid JSON object and nothing else. Do not wrap it in markdown or add any commentary.
The JSON object must strictly adhere to the following structure. Pay close attention to the field names.

{{
  "summary": "A concise, neutral summary of the key points of the meeting.",
  "key_topics": [
    {{"topic": "A short name for the main topic discussed", "details": "A more detailed summary of the discussion around this topic."}}
  ],
  "action_items": [
    {{
      "description": "The full description of a specific task or action item that was agreed upon.",
      "assigned_to": "The name of the person responsible, as mentioned in the text. Extract it as a string.",
      "due_date": "The deadline as mentioned in the text (e.g., 'next Friday', 'by the end of the month'). Extract it as a string."
    }}
  ],
  "decisions_made": [
    {{"description": "A clear and concise statement of a decision that was formally made."}}
  ],
  "mentioned_dates": [
    {{"text_mention": "Any mention of a specific date, deadline, or event (e.g., 'Q3 results', 'release on Monday')."}}
  ]
}}

Important rules for generating the JSON:
1.  For "action_items", only fill `description`, `assigned_to`, `due_date`. The other fields (`user_comment`) should not be in your output.
2.  For "mentioned_dates", only fill the `text_mention` field. The `parsed_date` field should not be in your output.
3.  If a category (like "decisions_made") has no items, you MUST provide an empty list `[]`.
4.  Ensure all specified keys are present in the final JSON object.

Now, generate the JSON response based on the transcription provided.
"""


async def analyze_transcription(transcription: str) -> AIAnalysis:
    try:
        prompt = PROMPT_TEMPLATE.format(transcription_text=transcription)

        response = await ollama.AsyncClient().chat(
            model=LOCAL_LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            format="json",
        )

        raw_content = response["message"]["content"]
        cleaned_json_str = raw_content.strip().lstrip("```json").rstrip("```").strip()
        analysis_data = json.loads(cleaned_json_str)

        return AIAnalysis(**analysis_data)

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from LLM response: {e}")
        raise ValueError(f"Failed to parse LLM response as JSON. Response: {raw_content}")
    except Exception as e:
        print(f"An unexpected error occurred during AI analysis: {e}")
        raise