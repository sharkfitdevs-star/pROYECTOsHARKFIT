#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command

# Delete migration history and recreate
call_command('migrate', '--run-syncdb', verbosity=2)

#Create tables using the schema from the models
from django.db import connection
from django.db import models
from apps.core.models_evo import Prospect, Member, Sale, AccessLog, SyncQueue

# Create all tables
with connection.schema_editor() as schema_editor:
    for model in [Prospect, Member, Sale, AccessLog, SyncQueue]:
        try:
            schema_editor.create_model(model)
            print(f"✓ Created table for {model.__name__}")
        except Exception as e:
            print(f"⚠ Table for {model.__name__} might already exist: {e}")

print("\n✅ All tables created successfully!")
