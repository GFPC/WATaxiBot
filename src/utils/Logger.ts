// src/utils/Logger.ts

export class Logger {
    private tag: string;
    private color: string;

    /**
     * @param tag - Текстовый тег (например, 'api', 'main')
     * @param color - Цвет в hex (например, '#ff9900')
     */
    constructor(tag: string, color: string) {
        this.tag = tag;
        this.color = color;
    }

    /**
     * Логирует сообщение с цветным тегом
     * @param message - Сообщение для вывода
     */
    log(message: string, ...args: any[]) {
        // Преобразуем hex в ANSI escape (24-bit truecolor)
        const hex = this.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const colorCode = `\x1b[38;2;${r};${g};${b}m`;
        const reset = "\x1b[0m";
        console.log(`${colorCode}[ ${this.tag} ]${reset} ${message}`, ...args);
    }
    info(message: string, ...args: any[]) {
        // Преобразуем hex в ANSI escape (24-bit truecolor)
        const hex = this.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const colorCode = `\x1b[38;2;${r};${g};${b}m`;
        const reset = "\x1b[0m";
        console.log(`${colorCode}[ ${this.tag} ]${reset} ${message}`, ...args);
    }
    error(message: string, ...args: any[]) {
        // Преобразуем hex в ANSI escape (24-bit truecolor)
        const hex = this.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const colorCode = `\x1b[38;2;${r};${g};${b}m`;
        const reset = "\x1b[0m";
        console.log(`${colorCode}[ ${this.tag} ]${reset} ${message}`, ...args);
    }
}
