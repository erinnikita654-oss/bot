import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import {
  getOrCreateUser,
  saveUserEvent,
  saveStory,
  getRandomStoryByCategory,
} from './database.js';
import { categorizeEvent, generateComfortingStory } from './storyGenerator.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('Бот запущен и готов к работе...');

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username || '';
  const firstName = msg.from.first_name || 'Пользователь';

  try {
    await getOrCreateUser(telegramId, username, firstName);

    const welcomeMessage = `Привет, ${firstName}! 👋

Я бот-поддержка, созданный, чтобы помочь тебе в трудные моменты.

Когда тебе грустно или что-то расстроило, просто напиши мне об этом. Я поделюсь похожей историей, которая, возможно, поможет тебе почувствовать, что ты не один.

Просто опиши, что произошло, и я постараюсь поддержать тебя. 💙`;

    await bot.sendMessage(chatId, welcomeMessage);
  } catch (error) {
    console.error('Error in /start command:', error);
    await bot.sendMessage(
      chatId,
      'Произошла ошибка. Пожалуйста, попробуйте позже.'
    );
  }
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `📖 Как пользоваться ботом:

1. Просто напишите мне о том, что вас расстроило
2. Я проанализирую ваше сообщение
3. Поделюсь похожей историей для поддержки

Команды:
/start - Начать работу с ботом
/help - Показать это сообщение
/stats - Статистика ваших обращений

Помните: я здесь, чтобы поддержать вас! 💙`;

  await bot.sendMessage(chatId, helpMessage);
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    const user = await getOrCreateUser(
      telegramId,
      msg.from.username || '',
      msg.from.first_name || 'Пользователь'
    );

    const { supabase } = await import('./config.js');
    const { data: events, error } = await supabase
      .from('user_events')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    const categories = {};
    events.forEach((event) => {
      categories[event.category] = (categories[event.category] || 0) + 1;
    });

    let statsMessage = `📊 Ваша статистика:\n\nВсего обращений: ${events.length}\n\n`;

    if (Object.keys(categories).length > 0) {
      statsMessage += 'По категориям:\n';
      Object.entries(categories).forEach(([category, count]) => {
        statsMessage += `• ${category}: ${count}\n`;
      });
    }

    await bot.sendMessage(chatId, statsMessage);
  } catch (error) {
    console.error('Error in /stats command:', error);
    await bot.sendMessage(
      chatId,
      'Не удалось получить статистику. Попробуйте позже.'
    );
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) {
    return;
  }

  const telegramId = msg.from.id;
  const username = msg.from.username || '';
  const firstName = msg.from.first_name || 'Пользователь';

  try {
    await bot.sendChatAction(chatId, 'typing');

    const user = await getOrCreateUser(telegramId, username, firstName);

    const category = await categorizeEvent(text);
    console.log(`Categorized as: ${category}`);

    await saveUserEvent(user.id, text, category);

    const existingStory = await getRandomStoryByCategory(category);

    let storyText;
    if (existingStory) {
      storyText = existingStory.story_text;
      console.log('Using existing story from database');
    } else {
      await bot.sendChatAction(chatId, 'typing');
      storyText = await generateComfortingStory(text, category);
      console.log('Generated new story');

      try {
        await saveStory(category, storyText);
      } catch (error) {
        console.error('Error saving story:', error);
      }
    }

    await bot.sendMessage(chatId, storyText, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error processing message:', error);
    await bot.sendMessage(
      chatId,
      'Извините, произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте ещё раз.'
    );
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});
