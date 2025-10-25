
import logging
import sys
from logging.handlers import TimedRotatingFileHandler

def setup_logging():
    log_formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    
    # File handler
    file_handler = TimedRotatingFileHandler("logs/app.log", when="midnight", interval=1, backupCount=7)
    file_handler.setFormatter(log_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Set pymongo logger to WARNING
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    
    # Configure uvicorn loggers to use the same handlers
    logging.getLogger("uvicorn.access").handlers = [console_handler]
    logging.getLogger("uvicorn.error").handlers = [console_handler]

