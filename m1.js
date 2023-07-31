const express = require('express');
const app = express();
const amqp = require('amqplib');
const logger = require('./logger');

const QUEUE_NAME = 'tasks';

// Middleware для логирования запросов
app.use((req, res, next) => {
  logger.info(`Received HTTP ${req.method} request to ${req.url}`);
  next();
});

// Обработка входящих HTTP запросов
app.get('/process', async (req, res) => {
  try {
    // Подключение к RabbitMQ
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    
    // Определение очереди
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Трансформация HTTP запроса в задание и отправка в очередь RabbitMQ
    const task = JSON.stringify({ url: req.url });
    channel.sendToQueue(QUEUE_NAME, Buffer.from(task), { persistent: true });

    // Закрытие соединения с RabbitMQ
    await channel.close();
    await connection.close();

    // Возвращение успешного ответа HTTP клиенту
    res.status(200).json({ message: 'Task received successfully' });
  } catch (error) {
    logger.error(`Error processing request: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Запуск HTTP сервера
app.listen(3000, () => {
  logger.info('M1: HTTP server listening on port 3000');
});
