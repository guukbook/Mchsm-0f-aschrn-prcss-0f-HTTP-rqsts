m2.js
const amqp = require('amqplib');
const logger = require('./logger');

const QUEUE_NAME = 'tasks';
const RESULT_QUEUE_NAME = 'results';

// Функция для обработки задания
async function processTask(task) {
  // Вместо этого можно добавить вашу логику обработки задания
  // Например, выполнить какие-то вычисления или запросы к сторонним сервисам
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return { result: `Processed task: ${task.url}` };
}

// Функция для отправки результата обратно в RabbitMQ
async function sendResultToQueue(result) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertQueue(RESULT_QUEUE_NAME, { durable: true });
  channel.sendToQueue(RESULT_QUEUE_NAME, Buffer.from(JSON.stringify(result)), {
    persistent: true,
  });

  await channel.close();
  await connection.close();
}

// Функция для обработки заданий из очереди
async function processTasksFromQueue() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);

    logger.info('M2: Waiting for messages in the queue...');

    channel.consume(QUEUE_NAME, async (msg) => {
      const task = JSON.parse(msg.content.toString());
      logger.info(`M2: Received task: ${task.url}`);

      const result = await processTask(task);
      await sendResultToQueue(result);

      logger.info(`M2: Task processed: ${task.url}`);

      channel.ack(msg);
    });
  } catch (error) {
    logger.error(`Error processing tasks: ${error.message}`);
  }
}

// Запуск обработчика заданий
processTasksFromQueue();
