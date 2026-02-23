# Bot runner image
# Runs engine/runner.py inside the container.
# Players' bots are mounted at /bot/bot.py at runtime.
FROM python:3.11-slim

WORKDIR /app

# Copy the engine and SDK only — no pip packages needed
COPY engine/ /app/engine/
COPY bigas/ /app/bigas/

# Make the bigas SDK importable for bot subprocesses
ENV PYTHONPATH=/app

# Disallow network access is handled at container level (network_disabled=True)
# No pip install — stdlib only for bot execution environment

ENTRYPOINT ["python", "/app/engine/runner.py"]
CMD ["/bot/bot.py"]
