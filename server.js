require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');

const app = express();
app.use(express.json());

// Render требует HTTP сервер на порту 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Render OK на порту ${PORT}`);
});

// Health check для Render
app.get('/', (req, res) => {
  res.send('🤖 Telegram Bot OK!');
});

// ВАШ BOT КОД ЗДЕСЬ (замените на свой)
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Приветствие
bot.start((ctx) => {
  ctx.reply('🤖 Бот работает! Напиши что-то грустное — помогу ❤️');
});

// Обработка сообщений
bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  ctx.reply(`Ты написал: "${message}"\n🤔 Сейчас подумаю, как тебя поддержать...`);
});

// Запуск бота
bot.launch();
console.log('🚀 Telegram бот запущен!');

module.exports = app; // для Render
