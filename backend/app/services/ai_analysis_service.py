
import logging
from typing import Optional

from .prompt_template import PROMPT_TEMPLATE
from ..models.ai_analysis import AIAnalysis
from ..crud import crud_meetings
from ..schemas.meeting_schema import MeetingUpdate
from ..models.processing_status import ProcessingStatus
from ..models.enums.processing_stage import ProcessingStage
from .analysis.factory import AIAnalysisFactory

LOGGER = logging.getLogger(__name__)


class AIAnalysisService:
    _instance: Optional["AIAnalysisService"] = None

    def __init__(self):
        LOGGER.debug("AIAnalysisService initialized.")
        pass

    @classmethod
    def get_instance(cls) -> "AIAnalysisService":
        if cls._instance is None:
            LOGGER.debug("Creating new AIAnalysisService instance.")
            cls._instance = AIAnalysisService()
        return cls._instance

    @classmethod
    async def run_ai_analysis(cls, database, meeting_id: str, transcription_text: str) -> AIAnalysis:
        LOGGER.info(f"Starting AI analysis for meeting ID: {meeting_id}")
        if not transcription_text or not transcription_text.strip():
            LOGGER.error(f"Empty transcription_text supplied for meeting ID: {meeting_id}")
            raise ValueError("Empty transcription_text supplied to AIAnalysisService")

        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting:
            LOGGER.error(f"Meeting not found for ID: {meeting_id}")
            raise ValueError(f"Meeting not found for id: {meeting_id}")

        mode = getattr(meeting.processing_config, "processing_mode_selected", "local")
        language = getattr(meeting.processing_config, "language", "pl")
        LOGGER.info("AIAnalysisService: mode=%s, language=%s for meeting=%s", mode, language, meeting_id)

        prompt_text = PROMPT_TEMPLATE.format(language=language, transcription_text=transcription_text)
        LOGGER.debug(f"Generated prompt for AI analysis for meeting ID: {meeting_id}")

        strategy = AIAnalysisFactory.get_strategy(mode)
        LOGGER.debug(f"Using AI analysis strategy: {type(strategy).__name__} for meeting ID: {meeting_id}")

        try:
            ai_analysis_obj: AIAnalysis = await strategy.analyze(prompt_text)
            LOGGER.info(f"AI analysis completed successfully for meeting ID: {meeting_id}")
        except Exception as e:
            LOGGER.exception("AI analysis failed for meeting %s: %s", meeting_id, e)
            try:
                await crud_meetings.update_meeting(
                    database,
                    meeting_id,
                    MeetingUpdate(
                        processing_status=ProcessingStatus(
                            current_stage=ProcessingStage.FAILED,
                            error_message=str(e)
                        )
                    )
                )
                LOGGER.info(f"Updated meeting {meeting_id} status to FAILED after AI analysis error.")
            except Exception:
                LOGGER.exception("Failed to set FAILED status after analysis error")
            raise

        ai_analysis_payload = ai_analysis_obj.dict() if hasattr(ai_analysis_obj, "dict") else ai_analysis_obj

        await crud_meetings.update_meeting(
            database,
            meeting_id,
            MeetingUpdate(ai_analysis=ai_analysis_payload)
        )
        LOGGER.info(f"AI analysis results saved for meeting ID: {meeting_id}")

        return ai_analysis_obj

