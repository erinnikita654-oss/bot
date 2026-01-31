import dotenv from 'dotenv';

dotenv.config();

const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;
const API_ENDPOINT = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

async function callYandexAPI(messages, temperature = 0.3, maxTokens = 50) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${YANDEX_API_KEY}`,
      },
      body: JSON.stringify({
        modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt/latest`,
        completionOptions: {
          stream: false,
          temperature: temperature,
          maxTokens: maxTokens,
        },
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Yandex API error:', error);
      throw new Error(error.message || 'API request failed');
    }

    const data = await response.json();
    return data.result.alternatives[0].message.content;
  } catch (error) {
    console.error('Error calling Yandex API:', error);
    throw error;
  }
}

export async function categorizeEvent(eventText) {
  try {
    const content = await callYandexAPI([
      {
        role: 'system',
        text: `Ты помощник, который категоризирует жизненные события.
        Определи категорию события из следующих вариантов:
        работа, отношения, семья, здоровье, финансы, образование, дружба, личное_развитие, общее.
        Ответь только одним словом - названием категории на русском языке.`,
      },
      {
        role: 'user',
        text: eventText,
      },
    ], 0.3, 50);

    return content.trim().toLowerCase();
  } catch (error) {
    console.error('Error categorizing event:', error);
    return 'общее';
  }
}

export async function generateComfortingStory(eventText, category) {
  try {
    const content = await callYandexAPI([
      {
        role: 'system',
        text: `Ты чуткий и поддерживающий помощник. Пользователь поделился расстраивающим событием из своей жизни.
        Твоя задача - рассказать похожую историю из той же области жизни, которая:
        1. Показывает, что такие ситуации случаются с многими людьми
        2. Имеет обнадеживающий или поучительный конец
        3. Написана тёплым, понимающим тоном
        4. Не преуменьшает чувства пользователя
        5. Длится 3-5 предложений

        История может быть реальной или выдуманной, но должна звучать правдоподобно.
        Начни историю с фразы вроде "Я знаю похожую историю..." или "Кто-то однажды рассказал мне..."`,
      },
      {
        role: 'user',
        text: `Категория: ${category}\n\nСобытие пользователя: ${eventText}`,
      },
    ], 0.8, 500);

    return content.trim();
  } catch (error) {
    console.error('Error generating story:', error);
    return `Я понимаю, как это может быть непросто. Знаешь, многие люди сталкивались с похожими ситуациями в области "${category}".
    Важно помнить, что трудные моменты - это часть жизни, и они помогают нам расти.
    Ты не одинок в своих переживаниях, и это тоже пройдёт. Держись! 💪`;
  }
}
