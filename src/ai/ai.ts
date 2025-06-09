import OpenAI from 'openai';

const ai_url = "https://openrouter.ai/api/v1";
const ai_token = "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";
const model = "deepseek/deepseek-r1-0528:free";

const openai = new OpenAI({
    baseURL: ai_url,
    apiKey: ai_token,
});
async function getCompletion(message: string) {
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
const start_time = Date.now();
getCompletion("Ты помощник по заказам такси в ватцап боте, твой ответ напрямую отправится пользователю. Вопрос клиента: почему так долго ищется машина? Отвечай кратко и быстро").then(
    r => console.log(r, Date.now() - start_time),
)