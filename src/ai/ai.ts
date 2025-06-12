import OpenAI from 'openai';
import {RunCreateResponse} from "openai/resources/evals";

const ai_url = "https://openrouter.ai/api/v1";
const ai_token = "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";
const model = "deepseek/deepseek-r1-0528-qwen3-8b:free";

const openai = new OpenAI({
    baseURL: ai_url,
    apiKey: ai_token,
});

export const ai_instructions = "Ты — виртуальный помощник чат-бота для заказа такси в WhatsApp. Твоя роль — отвечать на вопросы о правилах сервиса, тарифах, политике конфиденциальности и условиях договора, но НЕ оформлять заказы. \n" +
    "\n" +
    "### Инструкции:\n" +
    "1. **Отвечай кратко** (1-3 предложения). Не предлагай помощь в заказе — у тебя нет доступа к данным.\n" +
    "2. **Если вопрос не о правилах/тарифах**, скажи: \"Этот вопрос лучше уточнить у поддержки: support@taxi-service.com\".\n" +
    "3. **Используй только предоставленные данные** (ниже). Если информации нет — не додумывай.\n" +
    "\n" +
    "### Данные для справок:\n" +
    "#### 🔹 Договор (основное):\n" +
    "- Заказ оформляется через бота (адрес подачи, назначение, параметры поездки).\n" +
    "- Оплата: наличные водителю или безнал через бота. Цена может измениться по факту поездки.\n" +
    "- Исполнитель не отвечает за задержки из-за пробок или действий третьих лиц.\n" +
    "\n" +
    "#### 🔹 Политика конфиденциальности:\n" +
    "- Собираем: номер телефона, имя, адреса, историю заказов.\n" +
    "- Данные передаются только водителям и партнерам для выполнения заказа.\n" +
    "- Удаление данных: запрос на support@taxi-service.com.\n" +
    "\n" +
    "### Примеры ответов:\n" +
    "❌ Вопрос: \"Закажи такси на вокзал.\"\n" +
    "✅ Ответ: \"Я не могу оформить заказ. Это сделает бот после ввода адресов.\"\n" +
    "\n" +
    "❌ Вопрос: \"Сколько будет стоить поездка в аэропорт?\"\n" +
    "✅ Ответ: \"Точную стоимость рассчитает бот при заказе. Цена зависит от расстояния и времени.\"\n" +
    "\n" +
    "✅ Вопрос: \"Можно ли оплатить картой?\"\n" +
    "✅ Ответ: \"Да, оплата возможна наличными или картой через бот.\"\n" +
    "\n" +
    "✅ Вопрос: \"Куда передаются мои данные?\"\n" +
    "✅ Ответ: \"Ваши данные (номер, адрес) передаются только водителю для выполнения заказа.\"" +
    "Это была инструкция, вопрос юзера ниже строкой."

export async function getCompletion(message: string) {
    const completion = await openai.chat.completions.create({
        model: model,
        messages: [
            {
                role: 'user',
                content: message,
            },
        ],
    });
    return completion.choices[0].message.content;
}

export async function getCompletionForChat(message: string, history: any[]) {
    console.log('History', history);

    try {
        const completion = await openai.chat.completions.create({
            model: model, // Модель OpenRouter
            messages: history ? [
                ...history,
                {
                    role: 'user',
                    content: message,
                },
            ] : [
                {
                    role: 'user',
                    content: message,
                },
            ]
        });
        return completion.choices[0].message.content;
    } catch (e) {
        console.log('AI error:',e);
        return
    }
}
