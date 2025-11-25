from enum import Enum


class ProcessingMode(str, Enum):
    LOCAL = "local"
    REMOTE = "remote"
