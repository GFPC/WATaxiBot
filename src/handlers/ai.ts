import {Context} from "../index";
import {localizationNames} from "../l10n";
import {ai_instructions, getCompletionForChat} from "../ai/ai";
export async function AIHandler(ctx: Context): Promise<void> {
    console.log('AIHandler', ctx.message.body,'nextState', await ctx.storage.pull(ctx.userID));

    const messages_history = await ctx.aiStorage.pull(ctx.userID);
    const state = await ctx.storage.pull(ctx.userID);

    switch (state?.state) {
        case "aiAnswer":
            switch (ctx.message.body) {
                case "1":
                    await ctx.chat.sendMessage("Всего доброго, до скорой встречи!");
                    state.state = state.data.nextStateForAI;
                    const nextMessage = state.data.nextMessageForAI;
                    await ctx.chat.sendMessage(nextMessage);
                    await ctx.storage.push(ctx.userID, state);
                    break;
                case "2":
                    await ctx.chat.sendMessage("Спасибо за отзыв, до скорой встречи!");
                    break;
                default:
                    state.data.aiMessage = await ctx.chat.sendMessage("Жду ответа от ИИ...");
                    const response = await getCompletionForChat(ctx.message.body, messages_history);
                    await state.data.aiMessage.edit("Ответ получен, он будет ниже");
                    await ctx.chat.sendMessage(response ?? "Не удалось получить ответ от ИИ");
                    await ctx.chat.sendMessage("1 - выйти из чата с ИИ, 2- оставить отзыв об ответе, если у вас есть еще вопросы, пишите")
                    state.state = 'aiAnswer';
                    await ctx.storage.push(ctx.userID, state);
                    await ctx.aiStorage.push(ctx.userID, [
                        ...messages_history,
                        {
                            role: "user",
                            content: ctx.message.body,
                        },
                        {
                            role: "assistant",
                            content: response,
                        },
                    ]);
                    break;
            }
            break
        case "aiQuestion":
            await state.data.aiMessage.edit("Жду ответа от ИИ...");
            //const response = await getCompletion(ctx.message.body);
            const response = await getCompletionForChat(!messages_history? ai_instructions + '\n\n' + ctx.message.body: ctx.message.body, messages_history);
            await state.data.aiMessage.edit("Ответ получен, он будет ниже");
            await ctx.chat.sendMessage(response ?? "Не удалось получить ответ от ИИ");
            await ctx.chat.sendMessage("1 - выйти из чата с ИИ, 2- оставить отзыв об ответе, если у вас есть еще вопросы, пишите")
            state.state = 'aiAnswer';
            await ctx.storage.push(ctx.userID, state);
            await ctx.aiStorage.push(ctx.userID, messages_history ? [
                ...messages_history,
                {
                    role: "user",
                    content: ctx.message.body,
                },
                {
                    role: "assistant",
                    content: response,
                },
            ] : [
                {
                    role: "user",
                    content: ai_instructions + '\n\n' + ctx.message.body,
                },
                    {
                        role: "assistant",
                        content: response,
                    },
                ]
                );
            break;
        default:
            const aiMessage = await ctx.chat.sendMessage(
                "О чем вы хотите спросить ИИ?"
            )
            state.state = "aiQuestion";
            state.data.aiMessage = aiMessage;
            await ctx.storage.push(ctx.userID, state);
            break;
    }
}