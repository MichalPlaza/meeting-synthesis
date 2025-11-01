"""Unit tests for meeting indexing integration."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, UTC
from bson import ObjectId

from app.services.meeting_indexing_service import (
    index_meeting_to_knowledge_base,
    delete_meeting_from_knowledge_base,
    reindex_meeting,
)
from app.models.meeting import Meeting
from app.models.ai_analysis import AIAnalysis
from app.models.transcrpion import Transcription
from app.models.audio_file import AudioFile
from app.models.processing_config import ProcessingConfig
from app.models.enums.proccessing_mode import ProcessingMode


def create_test_meeting(**kwargs):
    """Helper to create a test meeting with all required fields."""
    defaults = {
        "title": "Test Meeting",
        "meeting_datetime": datetime(2025, 10, 1, 10, 0, 0, tzinfo=UTC),
        "project_id": ObjectId(),
        "uploader_id": ObjectId(),
        "tags": [],
        "audio_file": AudioFile(
            original_filename="test.mp3",
            storage_path_or_url="/media/test.mp3",
            mimetype="audio/mpeg"
        ),
        "processing_config": ProcessingConfig(
            language="en",
            processing_mode_selected=ProcessingMode.LOCAL
        ),
        "transcription": None,
        "ai_analysis": None,
    }
    defaults.update(kwargs)
    return Meeting(**defaults)


@pytest.mark.asyncio
class TestMeetingIndexingService:
    """Tests for automatic meeting indexing to Knowledge Base."""

    @patch('app.services.meeting_indexing_service.generate_embedding')
    @patch('app.services.meeting_indexing_service.index_meeting_document')
    async def test_index_meeting_with_transcription_and_summary(self, mock_index, mock_embed):
        """Test indexing meeting with transcription and AI summary."""
        # Arrange
        mock_embed.return_value = [0.1] * 384
        mock_index.return_value = True
        
        meeting = create_test_meeting(
            title="Sprint Planning Q4",
            tags=["sprint", "planning"],
            transcription=Transcription(full_text="We discussed Q4 priorities and roadmap."),
            ai_analysis=AIAnalysis(summary="Team decided to focus on features X and Y."),
        )
        
        # Act
        result = await index_meeting_to_knowledge_base(meeting)
        
        # Assert
        assert result is True
        assert mock_embed.call_count == 2  # transcription + summary
        assert mock_index.call_count == 2  # 2 documents indexed
        
        # Verify transcription document
        trans_call = mock_index.call_args_list[0]
        trans_doc = trans_call[0][0]
        assert trans_doc["meeting_id"] == str(meeting.id)
        assert trans_doc["content_type"] == "transcription"
        assert "Q4 priorities" in trans_doc["content"]
        
        # Verify summary document
        summary_call = mock_index.call_args_list[1]
        summary_doc = summary_call[0][0]
        assert summary_doc["content_type"] == "summary"
        assert "features X and Y" in summary_doc["content"]

    @patch('app.services.meeting_indexing_service.generate_embedding')
    @patch('app.services.meeting_indexing_service.index_meeting_document')
    async def test_index_meeting_transcription_only(self, mock_index, mock_embed):
        """Test indexing meeting with transcription but no AI analysis."""
        mock_embed.return_value = [0.1] * 384
        mock_index.return_value = True
        
        meeting = create_test_meeting(
            title="Daily Standup",
            transcription=Transcription(full_text="Quick sync on progress."),
            ai_analysis=None,
        )
        
        result = await index_meeting_to_knowledge_base(meeting)
        
        assert result is True
        mock_embed.assert_called_once()
        mock_index.assert_called_once()

    @patch('app.services.meeting_indexing_service.generate_embedding')
    @patch('app.services.meeting_indexing_service.index_meeting_document')
    async def test_index_meeting_with_action_items(self, mock_index, mock_embed):
        """Test indexing meeting with action items."""
        from app.models.action_items import ActionItem
        
        mock_embed.return_value = [0.1] * 384
        mock_index.return_value = True
        
        action_items = [
            ActionItem(description="Update documentation", assigned_to="John"),
            ActionItem(description="Review PR #123", assigned_to="Jane"),
        ]
        
        meeting = create_test_meeting(
            title="Sprint Planning",
            transcription=Transcription(full_text="Discussed tasks."),
            ai_analysis=AIAnalysis(
                summary="Planning session.",
                action_items=action_items
            ),
        )
        
        result = await index_meeting_to_knowledge_base(meeting)
        
        assert result is True
        # Should index: transcription + summary + action_items
        assert mock_index.call_count == 3
        
        # Verify action items document
        action_call = mock_index.call_args_list[2]
        action_doc = action_call[0][0]
        assert action_doc["content_type"] == "action_items"
        assert "Update documentation" in action_doc["content"]

    @patch('app.services.meeting_indexing_service.generate_embedding')
    @patch('app.services.meeting_indexing_service.index_meeting_document')
    async def test_index_meeting_no_content(self, mock_index, mock_embed):
        """Test indexing meeting with no transcription or AI analysis."""
        meeting = create_test_meeting(
            title="Empty Meeting",
        )
        
        result = await index_meeting_to_knowledge_base(meeting)
        
        assert result is False
        mock_embed.assert_not_called()
        mock_index.assert_not_called()

    @patch('app.services.meeting_indexing_service.generate_embedding')
    @patch('app.services.meeting_indexing_service.index_meeting_document')
    async def test_index_meeting_handles_errors(self, mock_index, mock_embed):
        """Test indexing handles errors gracefully."""
        mock_embed.side_effect = Exception("Embedding failed")
        
        meeting = create_test_meeting(
            title="Error Test",
            transcription=Transcription(full_text="Test content."),
        )
        
        result = await index_meeting_to_knowledge_base(meeting)
        
        assert result is False
        mock_index.assert_not_called()

    @patch('app.services.meeting_indexing_service.delete_meeting_documents')
    async def test_delete_meeting_from_knowledge_base(self, mock_delete):
        """Test deleting meeting documents from index."""
        mock_delete.return_value = True
        
        meeting_id = "meeting_123"
        result = await delete_meeting_from_knowledge_base(meeting_id)
        
        assert result is True
        mock_delete.assert_awaited_once_with(meeting_id)

    @patch('app.services.meeting_indexing_service.delete_meeting_from_knowledge_base')
    @patch('app.services.meeting_indexing_service.index_meeting_document')
    async def test_reindex_meeting(self, mock_index, mock_delete):
        """Test reindexing deletes old data and creates new."""
        from app.models.enums.processing_stage import ProcessingStage
        
        mock_delete.return_value = True
        mock_index.return_value = True
        
        meeting = create_test_meeting(
            title="Updated Meeting",
            transcription=Transcription(full_text="Updated content."),
        )
        meeting.processing_status.current_stage = ProcessingStage.COMPLETED
        
        with patch('app.services.meeting_indexing_service.generate_embedding') as mock_embed:
            mock_embed.return_value = [0.1] * 384
            result = await reindex_meeting(meeting)
        
        assert result is True
        mock_delete.assert_awaited_once()
        assert mock_index.call_count > 0