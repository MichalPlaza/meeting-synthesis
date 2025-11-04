"""Unit tests for AIAnalysisFactory - Strategy Pattern."""

import pytest
from unittest.mock import patch
from app.services.analysis.factory import AIAnalysisFactory
from app.services.analysis.strategies.local_llm import LocalLLMStrategy
from app.services.analysis.strategies.openai_llm import OpenAIStrategy


class TestAIAnalysisFactory:
    """Tests for AIAnalysisFactory strategy selection."""

    def test_get_strategy_local_mode(self):
        """Test factory returns LocalLLMStrategy for 'local' mode."""
        strategy = AIAnalysisFactory.get_strategy("local")
        
        assert strategy is not None
        assert isinstance(strategy, LocalLLMStrategy)

    def test_get_strategy_remote_mode(self):
        """Test factory returns OpenAIStrategy for 'remote' mode."""
        # Mock OpenAI API key environment variable
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            strategy = AIAnalysisFactory.get_strategy("remote")
            
            assert strategy is not None
            assert isinstance(strategy, OpenAIStrategy)

    def test_get_strategy_invalid_mode(self):
        """Test factory raises ValueError for unknown mode."""
        with pytest.raises(ValueError) as exc_info:
            AIAnalysisFactory.get_strategy("invalid_mode")
        
        assert "Unknown processing mode" in str(exc_info.value)
        assert "invalid_mode" in str(exc_info.value)

    def test_get_strategy_returns_new_instance(self):
        """Test factory returns new instances (not singletons)."""
        strategy1 = AIAnalysisFactory.get_strategy("local")
        strategy2 = AIAnalysisFactory.get_strategy("local")
        
        # Should be different instances
        assert strategy1 is not strategy2
        # But same type
        assert type(strategy1) == type(strategy2)

    def test_get_strategy_with_enum_value(self):
        """Test factory works with enum-like objects that have .value attribute."""
        # Simulate an enum with value attribute
        class MockEnum:
            def __init__(self, value):
                self.value = value
        
        mock_local = MockEnum("local")
        mock_remote = MockEnum("remote")
        
        strategy_local = AIAnalysisFactory.get_strategy(mock_local)
        
        # Mock OpenAI for remote strategy
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            strategy_remote = AIAnalysisFactory.get_strategy(mock_remote)
        
        assert isinstance(strategy_local, LocalLLMStrategy)
        assert isinstance(strategy_remote, OpenAIStrategy)

    def test_get_strategy_case_sensitive(self):
        """Test factory is case-sensitive for mode selection."""
        # Should work with lowercase
        strategy_lower = AIAnalysisFactory.get_strategy("local")
        assert isinstance(strategy_lower, LocalLLMStrategy)
        
        # Should fail with uppercase (case-sensitive)
        with pytest.raises(ValueError):
            AIAnalysisFactory.get_strategy("LOCAL")

    def test_get_strategy_with_whitespace_fails(self):
        """Test factory rejects mode with whitespace."""
        with pytest.raises(ValueError):
            AIAnalysisFactory.get_strategy("local ")
        
        with pytest.raises(ValueError):
            AIAnalysisFactory.get_strategy(" local")

    def test_get_strategy_empty_string_fails(self):
        """Test factory rejects empty string."""
        with pytest.raises(ValueError):
            AIAnalysisFactory.get_strategy("")

    def test_get_strategy_none_fails(self):
        """Test factory rejects None."""
        with pytest.raises((ValueError, AttributeError)):
            AIAnalysisFactory.get_strategy(None)
