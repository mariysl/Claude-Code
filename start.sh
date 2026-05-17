#!/bin/bash
pip install -r requirements.txt -q
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
