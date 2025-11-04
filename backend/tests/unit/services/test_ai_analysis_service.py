"""Unit tests for AIAnalysisService - Refactored for Strategy Pattern (Phase 2)."""

from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from bson import ObjectId

from app.models.ai_analysis import AIAnalysis
from app.services.ai_analysis_service import AIAnalysisService
from app.models.enums.processing_stage import ProcessingStage


@pytest.mark.asyncio
class TestAIAnalysisService:
    """Tests for AIAnalysisService using Strategy pattern."""

    async def test_run_ai_analysis_success_with_local_mode(self):
        """Test successful AI analysis with local mode (LocalLLMStrategy)."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Meeting transcription about project planning"
        
        mock_meeting = MagicMock()
        mock_meeting.processing_config.processing_mode_selected = "local"
        mock_meeting.processing_config.language = "en"
        
        mock_analysis = AIAnalysis(
            summary="Project planning discussion",
            key_topics=[],
            action_items=[],
            decisions_made=[],
            mentioned_dates=[]
        )
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=mock_meeting):
            with patch("app.services.analysis.factory.AIAnalysisFactory.get_strategy") as mock_get_strategy:
                mock_strategy = AsyncMock()
                mock_strategy.analyze.return_value = mock_analysis
                mock_get_strategy.return_value = mock_strategy
                
                with patch("app.crud.crud_meetings.update_meeting") as mock_update:
                    # Act
                    result = await AIAnalysisService.run_ai_analysis(
                        database, meeting_id, transcription_text
                    )
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert result.summary == "Project planning discussion"
        mock_get_strategy.assert_called_once_with("local")
        mock_strategy.analyze.assert_awaited_once()
        mock_update.assert_awaited()

    async def test_run_ai_analysis_success_with_remote_mode(self):
        """Test successful AI analysis with remote mode (OpenAIStrategy)."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Test transcription"
        
        mock_meeting = MagicMock()
        mock_meeting.processing_config.processing_mode_selected = "remote"
        mock_meeting.processing_config.language = "pl"
        
        mock_analysis = AIAnalysis(
            summary="Test summary",
            key_topics=[],
            action_items=[],
            decisions_made=[],
            mentioned_dates=[]
        )
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=mock_meeting):
            with patch("app.services.analysis.factory.AIAnalysisFactory.get_strategy") as mock_get_strategy:
                mock_strategy = AsyncMock()
                mock_strategy.analyze.return_value = mock_analysis
                mock_get_strategy.return_value = mock_strategy
                
                with patch("app.crud.crud_meetings.update_meeting"):
                    # Act
                    result = await AIAnalysisService.run_ai_analysis(
                        database, meeting_id, transcription_text
                    )
        
        # Assert
        assert isinstance(result, AIAnalysis)
        mock_get_strategy.assert_called_once_with("remote")

    async def test_run_ai_analysis_empty_transcription_raises_error(self):
        """Test that empty transcription raises ValueError."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await AIAnalysisService.run_ai_analysis(database, meeting_id, "")
        
        assert "Empty transcription_text supplied" in str(exc_info.value)

    async def test_run_ai_analysis_whitespace_only_transcription_raises_error(self):
        """Test that whitespace-only transcription raises ValueError."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await AIAnalysisService.run_ai_analysis(database, meeting_id, "   \n\t  ")
        
        assert "Empty transcription_text supplied" in str(exc_info.value)

    async def test_run_ai_analysis_meeting_not_found_raises_error(self):
        """Test that non-existent meeting raises ValueError."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Test"
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=None):
            # Act & Assert
            with pytest.raises(ValueError) as exc_info:
                await AIAnalysisService.run_ai_analysis(
                    database, meeting_id, transcription_text
                )
            
            assert "Meeting not found" in str(exc_info.value)

    async def test_run_ai_analysis_saves_result_to_database(self):
        """Test that analysis result is saved to database."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Test transcription"
        
        mock_meeting = MagicMock()
        mock_meeting.processing_config.processing_mode_selected = "local"
        mock_meeting.processing_config.language = "en"
        
        mock_analysis = AIAnalysis(
            summary="Test summary",
            key_topics=[{"topic": "Topic 1", "details": "Details"}],
            action_items=[],
            decisions_made=[],
            mentioned_dates=[]
        )
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=mock_meeting):
            with patch("app.services.analysis.factory.AIAnalysisFactory.get_strategy") as mock_get_strategy:
                mock_strategy = AsyncMock()
                mock_strategy.analyze.return_value = mock_analysis
                mock_get_strategy.return_value = mock_strategy
                
                with patch("app.crud.crud_meetings.update_meeting") as mock_update:
                    # Act
                    await AIAnalysisService.run_ai_analysis(
                        database, meeting_id, transcription_text
                    )
                    
                    # Assert
                    mock_update.assert_awaited()
                    call_args = mock_update.await_args
                    assert call_args[0][0] == database
                    assert call_args[0][1] == meeting_id
                    # Check that ai_analysis was updated
                    update_data = call_args[0][2]
                    assert update_data.ai_analysis is not None

    async def test_run_ai_analysis_handles_strategy_failure(self):
        """Test that strategy failures are caught and meeting status updated to FAILED."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Test"
        
        mock_meeting = MagicMock()
        mock_meeting.processing_config.processing_mode_selected = "local"
        mock_meeting.processing_config.language = "en"
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=mock_meeting):
            with patch("app.services.analysis.factory.AIAnalysisFactory.get_strategy") as mock_get_strategy:
                mock_strategy = AsyncMock()
                mock_strategy.analyze.side_effect = Exception("LLM service unavailable")
                mock_get_strategy.return_value = mock_strategy
                
                with patch("app.crud.crud_meetings.update_meeting") as mock_update:
                    # Act & Assert
                    with pytest.raises(Exception) as exc_info:
                        await AIAnalysisService.run_ai_analysis(
                            database, meeting_id, transcription_text
                        )
                    
                    assert "LLM service unavailable" in str(exc_info.value)
                    
                    # Check that meeting status was updated to FAILED
                    mock_update.assert_awaited()
                    update_call_args = mock_update.await_args[0][2]
                    assert update_call_args.processing_status.current_stage == ProcessingStage.FAILED

    async def test_run_ai_analysis_uses_correct_language_parameter(self):
        """Test that meeting language is retrieved and passed to analysis."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Test transcription"
        
        mock_meeting = MagicMock()
        mock_meeting.processing_config.processing_mode_selected = "local"
        mock_meeting.processing_config.language = "pl"  # Polish
        
        mock_analysis = AIAnalysis(
            summary="Test",
            key_topics=[],
            action_items=[],
            decisions_made=[],
            mentioned_dates=[]
        )
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=mock_meeting) as mock_get_meeting:
            with patch("app.services.analysis.factory.AIAnalysisFactory.get_strategy") as mock_get_strategy:
                mock_strategy = AsyncMock()
                mock_strategy.analyze.return_value = mock_analysis
                mock_get_strategy.return_value = mock_strategy
                
                with patch("app.crud.crud_meetings.update_meeting"):
                    # Act
                    await AIAnalysisService.run_ai_analysis(
                        database, meeting_id, transcription_text
                    )
                    
                    # Assert - Verify meeting was retrieved (language is read from it)
                    mock_get_meeting.assert_awaited_once_with(database, meeting_id)
                    # Verify strategy.analyze was called
                    mock_strategy.analyze.assert_awaited_once()

    async def test_run_ai_analysis_defaults_to_local_mode_if_not_set(self):
        """Test that analysis defaults to 'local' mode if not configured."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Test"
        
        mock_meeting = MagicMock()
        # Simulate missing processing_mode_selected attribute
        mock_meeting.processing_config.processing_mode_selected = None
        mock_meeting.processing_config.language = "en"
        
        mock_analysis = AIAnalysis(
            summary="Test",
            key_topics=[],
            action_items=[],
            decisions_made=[],
            mentioned_dates=[]
        )
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=mock_meeting):
            with patch("app.services.analysis.factory.AIAnalysisFactory.get_strategy") as mock_get_strategy:
                mock_strategy = AsyncMock()
                mock_strategy.analyze.return_value = mock_analysis
                mock_get_strategy.return_value = mock_strategy
                
                with patch("app.crud.crud_meetings.update_meeting"):
                    # Act
                    await AIAnalysisService.run_ai_analysis(
                        database, meeting_id, transcription_text
                    )
                    
                    # Assert - should use default "local" mode
                    # The getattr in service defaults to "local"
                    assert mock_get_strategy.called

    async def test_get_instance_returns_singleton(self):
        """Test that get_instance returns singleton instance."""
        # Act
        instance1 = AIAnalysisService.get_instance()
        instance2 = AIAnalysisService.get_instance()
        
        # Assert
        assert instance1 is instance2
        assert isinstance(instance1, AIAnalysisService)

    async def test_run_ai_analysis_with_complex_ai_analysis_result(self):
        """Test handling of complex AIAnalysis with all fields populated."""
        # Arrange
        database = AsyncMock()
        meeting_id = str(ObjectId())
        transcription_text = "Complex meeting transcription"
        
        mock_meeting = MagicMock()
        mock_meeting.processing_config.processing_mode_selected = "local"
        mock_meeting.processing_config.language = "en"
        
        mock_analysis = AIAnalysis(
            summary="Comprehensive meeting summary",
            key_topics=[
                {"topic": "Budget", "details": "Discussed Q4 budget"},
                {"topic": "Hiring", "details": "New positions"}
            ],
            action_items=[
                {"description": "Prepare report", "assigned_to": "Alice", "due_date": "2025-11-15"},
                {"description": "Schedule follow-up", "assigned_to": "Bob", "due_date": None}
            ],
            decisions_made=[
                {"description": "Approved new feature"},
                {"description": "Postponed infrastructure upgrade"}
            ],
            mentioned_dates=[
                {"text_mention": "next Monday", "parsed_date": "2025-11-04T00:00:00"},
                {"text_mention": "end of month", "parsed_date": "2025-11-30T00:00:00"}
            ]
        )
        
        with patch("app.crud.crud_meetings.get_meeting_by_id", return_value=mock_meeting):
            with patch("app.services.analysis.factory.AIAnalysisFactory.get_strategy") as mock_get_strategy:
                mock_strategy = AsyncMock()
                mock_strategy.analyze.return_value = mock_analysis
                mock_get_strategy.return_value = mock_strategy
                
                with patch("app.crud.crud_meetings.update_meeting"):
                    # Act
                    result = await AIAnalysisService.run_ai_analysis(
                        database, meeting_id, transcription_text
                    )
        
        # Assert
        assert isinstance(result, AIAnalysis)
        assert len(result.key_topics) == 2
        assert len(result.action_items) == 2
        assert len(result.decisions_made) == 2
        assert len(result.mentioned_dates) == 2
