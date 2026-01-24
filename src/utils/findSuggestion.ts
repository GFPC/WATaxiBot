/**
 * Умный поиск в списке с подсказками для исправления опечаток
 * @param userInput Ввод пользователя
 * @param items Список элементов для поиска
 * @param options Настройки поиска
 * @returns Массив подсказок (от наиболее релевантных к менее)
 */
export function findSuggestionsInList<T extends string>(
    userInput: string,
    items: T[],
    options: {
        minInputLength?: number;
        maxSuggestions?: number;
        /** Максимальное количество опечаток (0, 1, 2, 3) */
        maxTypos?: number;
        /** Минимальная схожесть для коротких слов (используется если maxTypos не указан) */
        similarityThreshold?: number;
    } = {}
): T[] {
    const {
        minInputLength = 2,
        maxSuggestions = 3,
        maxTypos = 2, // Разрешаем 2 опечатки по умолчанию
        similarityThreshold = 0.7
    } = options;

    const input = userInput.toLowerCase().trim();

    if (input.length < minInputLength) {
        return [];
    }

    const suggestions: Array<{item: T, score: number, distance: number}> = [];

    for (const item of items) {
        const itemLower = item.toLowerCase();

        // 1. ТОЧНОЕ СОВПАДЕНИЕ
        if (itemLower === input) {
            return [item];
        }

        let score = 0;
        let distance = 0;

        // 2. НАЧИНАЕТСЯ С ВВОДА
        if (itemLower.startsWith(input)) {
            score = 100 + (input.length / itemLower.length) * 10;
            distance = 0;
        }
        // 3. СОДЕРЖИТ ВВОД
        else if (itemLower.includes(input)) {
            score = 50 + (input.length / itemLower.length) * 10;
            distance = 0;
        }
        // 4. ПРОВЕРКА ОПЕЧАТОК
        else {
            // Вычисляем расстояние Левенштейна
            const levDistance = levenshteinDistance(itemLower, input);

            // Определяем максимально допустимое расстояние
            let allowedDistance: number;

            if (maxTypos !== undefined) {
                // Фиксированное количество опечаток
                allowedDistance = maxTypos;
            } else {
                // Динамическое на основе длины (старый подход)
                allowedDistance = Math.max(1, Math.floor(input.length * (1 - similarityThreshold)));
            }

            // Если расстояние в пределах допустимого
            if (levDistance <= allowedDistance) {
                distance = levDistance;
                // Чем меньше расстояние, тем выше score
                const maxLength = Math.max(itemLower.length, input.length);
                const similarity = 1 - (levDistance / maxLength);
                score = similarity * 30; // Максимум 30 баллов за опечатки
            }
        }

        if (score > 0) {
            suggestions.push({item, score, distance});
        }
    }

    // Сначала сортируем по distance (меньше опечаток = лучше),
    // затем по score (выше релевантность = лучше)
    return suggestions
        .sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance; // Меньше опечаток = выше
            }
            return b.score - a.score; // Выше score = выше
        })
        .slice(0, maxSuggestions)
        .map(suggestion => suggestion.item);
}

function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // Инициализация матрицы
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Заполнение матрицы
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,     // удаление
                matrix[i][j - 1] + 1,     // вставка
                matrix[i - 1][j - 1] + cost // замена
            );
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Рассчитывает схожесть двух строк (0-1)
 */
export function calculateSimilarity(a: string, b: string): number {
    let matches = 0;
    const maxLength = Math.max(a.length, b.length);

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++;
    }

    // Штраф за разницу в длине
    const lengthPenalty = Math.abs(a.length - b.length) * 0.1;
    const baseSimilarity = matches / maxLength;

    return Math.max(0, baseSimilarity - lengthPenalty);
}

// Дополнительная функция для удобства - возвращает первый результат или null
export function findBestMatch<T extends string>(
    userInput: string,
    items: T[],
    options?: Parameters<typeof findSuggestionsInList>[2]
): T | null {
    const suggestions = findSuggestionsInList(userInput, items, options);
    return suggestions.length > 0 ? suggestions[0] : null;
}