"""Django → Mongo bridge client package (lightweight)
This package provides a tiny HTTP client Django can use to fetch data from the Node data-intake API (Mongo-backed).
"""

from .client import DjangoMongoBridgeClient

__all__ = ["DjangoMongoBridgeClient"]
