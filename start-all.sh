#!/bin/bash

# Start RabbitMQ
echo "Starting RabbitMQ..."
docker run -d --name rabbitmq_container -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Wait for RabbitMQ to be ready
echo "Waiting for RabbitMQ to be ready..."
until curl -s http://localhost:15672 >/dev/null 2>&1; do
  sleep 1
done
echo "RabbitMQ is ready."

# Start Redis
echo "Starting Redis..."
docker run -d --name redis_container -p 6379:6379 redis:latest

# Run npm dev
echo "Starting npm dev server..."
npm run start
