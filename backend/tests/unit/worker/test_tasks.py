"""Unit tests for worker tasks."""

import pytest
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from app.models.enums.processing_stage import ProcessingStage
from app.models.processing_status import ProcessingStatus

from app.worker import tasks
from app.worker.tasks import (
    _update_processing_stage,
    _run_transcription,
    _run_ai_analysis,
    _run_indexing,
    _publish_completion_event,
)


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


@pytest.mark.asyncio
class TestUpdateProcessingStage:
    """Tests for _update_processing_stage helper function."""

    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    async def test_updates_stage_successfully(self, mock_update):
        """Test that stage is updated correctly."""
        mock_db = AsyncMock()
        mock_update.return_value = MagicMock()

        await _update_processing_stage(mock_db, "meeting123", ProcessingStage.TRANSCRIBING)

        mock_update.assert_called_once()
        call_args = mock_update.call_args[0]
        assert call_args[0] == mock_db
        assert call_args[1] == "meeting123"
        assert call_args[2].processing_status.current_stage == ProcessingStage.TRANSCRIBING

    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    async def test_updates_with_error_message(self, mock_update):
        """Test that error message is included for failed stage."""
        mock_db = AsyncMock()

        await _update_processing_stage(
            mock_db, "meeting123", ProcessingStage.FAILED, error_message="Test error"
        )

        call_args = mock_update.call_args[0]
        assert call_args[2].processing_status.current_stage == ProcessingStage.FAILED
        assert call_args[2].processing_status.error_message == "Test error"

    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    async def test_updates_with_completed_at(self, mock_update):
        """Test that completed_at timestamp is included."""
        mock_db = AsyncMock()
        completed_time = datetime.now(timezone.utc)

        await _update_processing_stage(
            mock_db, "meeting123", ProcessingStage.COMPLETED, completed_at=completed_time
        )

        call_args = mock_update.call_args[0]
        assert call_args[2].processing_status.completed_at == completed_time


@pytest.mark.asyncio
class TestRunTranscription:
    """Tests for _run_transcription helper function."""

    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    @patch("app.worker.tasks.transcribe_audio", new_callable=AsyncMock)
    @patch("app.worker.tasks.os.path.exists")
    async def test_transcription_success(self, mock_exists, mock_transcribe, mock_update):
        """Test successful transcription."""
        mock_exists.return_value = True
        mock_transcribe.return_value = "This is the transcribed text."
        mock_db = AsyncMock()

        meeting = MagicMock()
        meeting.audio_file.storage_path_or_url = "test_audio.mp3"

        result = await _run_transcription(mock_db, "meeting123", meeting)

        assert result == "This is the transcribed text."
        mock_transcribe.assert_called_once()
        mock_update.assert_called_once()

    @patch("app.worker.tasks.os.path.exists")
    async def test_transcription_file_not_found(self, mock_exists):
        """Test transcription raises error when file not found."""
        mock_exists.return_value = False
        mock_db = AsyncMock()

        meeting = MagicMock()
        meeting.audio_file.storage_path_or_url = "missing_audio.mp3"

        with pytest.raises(FileNotFoundError) as exc_info:
            await _run_transcription(mock_db, "meeting123", meeting)

        assert "Audio file not found" in str(exc_info.value)


@pytest.mark.asyncio
class TestRunAiAnalysis:
    """Tests for _run_ai_analysis helper function."""

    @patch("app.worker.tasks.AIAnalysisService.get_instance")
    @patch("app.worker.tasks.crud_meetings.update_meeting", new_callable=AsyncMock)
    async def test_ai_analysis_success(self, mock_update, mock_get_instance):
        """Test successful AI analysis."""
        mock_db = AsyncMock()
        mock_service = MagicMock()
        mock_service.run_ai_analysis = AsyncMock()
        mock_get_instance.return_value = mock_service

        await _run_ai_analysis(mock_db, "meeting123", "Full transcription text")

        mock_update.assert_called_once()  # For ANALYZING stage update
        mock_service.run_ai_analysis.assert_called_once_with(
            mock_db, "meeting123", "Full transcription text"
        )


@pytest.mark.asyncio
class TestRunIndexing:
    """Tests for _run_indexing helper function."""

    @patch("app.services.meeting_indexing_service.index_meeting_to_knowledge_base", new_callable=AsyncMock)
    async def test_indexing_success(self, mock_index):
        """Test successful indexing."""
        mock_index.return_value = True
        meeting = MagicMock()
        meeting.id = "meeting123"

        result = await _run_indexing(meeting)

        assert result is True
        mock_index.assert_called_once_with(meeting)

    @patch("app.services.meeting_indexing_service.index_meeting_to_knowledge_base", new_callable=AsyncMock)
    async def test_indexing_returns_false_on_no_content(self, mock_index):
        """Test indexing returns False when no content to index."""
        mock_index.return_value = False
        meeting = MagicMock()
        meeting.id = "meeting123"

        result = await _run_indexing(meeting)

        assert result is False

    @patch("app.services.meeting_indexing_service.index_meeting_to_knowledge_base", new_callable=AsyncMock)
    async def test_indexing_handles_exception(self, mock_index):
        """Test indexing catches exceptions and returns False."""
        mock_index.side_effect = Exception("Elasticsearch unavailable")
        meeting = MagicMock()
        meeting.id = "meeting123"

        result = await _run_indexing(meeting)

        assert result is False


@pytest.mark.asyncio
class TestPublishCompletionEvent:
    """Tests for _publish_completion_event helper function."""

    @patch("app.worker.tasks.publish_event", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.get_meeting_by_id", new_callable=AsyncMock)
    async def test_publishes_event_successfully(self, mock_get_meeting, mock_publish):
        """Test event is published with correct data."""
        mock_db = AsyncMock()
        meeting = MagicMock()
        meeting.id = "meeting123"
        meeting.project_id = "project456"
        meeting.uploader_id = "user789"
        meeting.title = "Test Meeting"
        meeting.processing_status.current_stage.value = "completed"
        mock_get_meeting.return_value = meeting

        await _publish_completion_event(mock_db, "meeting123")

        mock_publish.assert_called_once()
        event_data = mock_publish.call_args[0][0]
        assert event_data["event_type"] == "meeting_processed"
        assert event_data["meeting_id"] == "meeting123"
        assert event_data["status"] == "completed"

    @patch("app.worker.tasks.publish_event", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.get_meeting_by_id", new_callable=AsyncMock)
    async def test_handles_missing_meeting(self, mock_get_meeting, mock_publish):
        """Test no event published when meeting not found."""
        mock_db = AsyncMock()
        mock_get_meeting.return_value = None

        await _publish_completion_event(mock_db, "missing_meeting")

        mock_publish.assert_not_called()

    @patch("app.worker.tasks.publish_event", new_callable=AsyncMock)
    @patch("app.worker.tasks.crud_meetings.get_meeting_by_id", new_callable=AsyncMock)
    async def test_handles_publish_exception(self, mock_get_meeting, mock_publish):
        """Test exception during publish is caught."""
        mock_db = AsyncMock()
        meeting = MagicMock()
        meeting.id = "meeting123"
        meeting.project_id = "project456"
        meeting.uploader_id = "user789"
        meeting.title = "Test Meeting"
        meeting.processing_status.current_stage.value = "completed"
        mock_get_meeting.return_value = meeting
        mock_publish.side_effect = Exception("Redis unavailable")

        # Should not raise - exception is logged but not propagated
        await _publish_completion_event(mock_db, "meeting123")
