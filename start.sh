#!/bin/bash
python3 -m pip install -r requirements.txt -q
python3 -m uvicorn app:app --host 0.0.0.0 --port 8080 --reload
