import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.models.enums.processing_stage import ProcessingStage
from app.models.processing_status import ProcessingStatus

from app.worker import tasks


@pytest.mark.asyncio
class TestWorkerTasks:

    @patch("app.worker.tasks.publish_event", new_callable=AsyncMock)
    @patch("app.services.meeting_indexing_service.index_meeting_to_knowledge_base", new_callable=AsyncMock)
    @patch("app.services.ai_analysis_service.AIAnalysisService.run_ai_analysis", new_callable=AsyncMock)
    @patch("app.worker.tasks.transcribe_audio", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.get_meeting_by_id", new_callable=AsyncMock)
    @patch("app.worker.tasks.os.path.exists")
    async def test_run_processing_success(
            self,
            mock_exists,
            mock_get_meeting,
            mock_update_meeting,
            mock_transcribe,
            mock_ai_analysis,
            mock_kb_index,
            mock_publish_event
    ):
        mock_exists.return_value = True
        mock_transcribe.return_value = "Test transcription"
        mock_ai_analysis.return_value = None  # run_ai_analysis doesn't return anything, updates DB directly
        mock_kb_index.return_value = True

        meeting_mock = MagicMock()
        meeting_mock.audio_file.storage_path_or_url = "uploads/test.mp3"
        meeting_mock.id = "meeting1"
        meeting_mock.project_id = "project1"
        meeting_mock.uploader_id = "user1"
        meeting_mock.title = "Test Meeting"
        meeting_mock.processing_status = ProcessingStatus(current_stage=ProcessingStage.TRANSCRIBING)
        mock_get_meeting.return_value = meeting_mock

        await tasks.run_processing("meeting1")

        mock_transcribe.assert_called_once()
        mock_ai_analysis.assert_called_once()
        mock_kb_index.assert_called_once()
        mock_publish_event.assert_called_once()

        final_update = mock_update_meeting.call_args_list[-1][0][2].processing_status
        assert final_update.current_stage == ProcessingStage.COMPLETED

    @patch("app.worker.tasks.publish_event", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.get_meeting_by_id", new_callable=AsyncMock)
    @patch("app.worker.tasks.os.path.exists")
    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    async def test_run_processing_missing_file_sets_failed(
            self, mock_update_meeting, mock_exists, mock_get_meeting, mock_publish_event
    ):
        meeting_mock = MagicMock()
        meeting_mock.audio_file.storage_path_or_url = "uploads/missing.mp3"
        meeting_mock.id = "meeting1"
        meeting_mock.project_id = "project1"
        meeting_mock.uploader_id = "user1"
        meeting_mock.title = "Test Meeting"
        mock_get_meeting.return_value = meeting_mock
        mock_exists.return_value = False

        await tasks.run_processing("meeting1")

        final_update = mock_update_meeting.call_args_list[-1][0][2].processing_status
        assert final_update.current_stage == ProcessingStage.FAILED
        assert "Audio file not found" in final_update.error_message

    @patch("app.worker.tasks.publish_event", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.get_meeting_by_id", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    async def test_run_processing_missing_meeting_sets_failed(
            self, mock_update_meeting, mock_get_meeting, mock_publish_event
    ):
        mock_get_meeting.return_value = None

        await tasks.run_processing("nonexistent_id")

        final_update = mock_update_meeting.call_args_list[-1][0][2].processing_status
        assert final_update.current_stage == ProcessingStage.FAILED
        assert "Meeting or audio file not found" in final_update.error_message

    @pytest.mark.skip(reason="Sync test in async test class - needs celery mock fixture")
    @patch("app.worker.tasks.run_processing", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    @patch("app.worker.tasks.AsyncIOMotorClient")
    def test_process_meeting_audio_task(self, mock_motor, mock_update, mock_run_processing):
        tasks.process_meeting_audio("meeting1")
        mock_update.assert_called()
        mock_run_processing.assert_awaited_once_with("meeting1")
