FROM python:3.12-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app

# Create cache directory if it doesn't exist and make it writable
RUN mkdir -p /code/cache && chmod 777 /code/cache

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
