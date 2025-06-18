import 'crypto';
// Конфигурация
const API_URL = 'http://localhost:8010'; // URL вашего сервера
const API_KEY = '123'; // API ключ из .env файла
const BOT_NAME = 'Taxi MultiConfig Bot config='; // Имя вашего бота
const BOT_DESCRIPTION = 'Optional bot description'; // Описание бота

export function getWAQRHubConfig(config_name: string, bot_phone: string) {
    return {
        API_URL,
        API_KEY,
        BOT_NAME: BOT_NAME+config_name,
        BOT_DESCRIPTION: BOT_DESCRIPTION+'CONFIG='+config_name+';PHONE='+bot_phone,
    };
}
/**
 * WhatsApp Bot Client for GFP Watcher-QR Integration
 * TypeScript client for communicating with Telegram bot API
 */

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:8010/api',
    ENDPOINTS: {
        STATUS: '/status',
        REGISTER: '/whatsapp/register',
        CHECK_REGISTER: '/whatsapp/check_register',
        UPDATE_QR: '/whatsapp/update_qr',
        UPDATE_AUTH_STATE: '/whatsapp/update_auth_state',
        NOTIFY: '/whatsapp/notify'
    }
} as const;

// Types
interface WhatsAppBotData {
    id: string;
    name: string;
    description: string;
}

interface WhatsAppBotRegisterRequest {
    bot: WhatsAppBotData;
}

interface WhatsAppBotCheckRegisterRequest {
    bot_id: string;
}

interface WhatsAppBotUpdateQRRequest {
    bot_id: string;
    qr_data: string;
}

interface WhatsAppBotAuthedStateRequest {
    bot_id: string;
    state: 'authed' | 'not_authed';
}

interface WhatsAppBotResponse {
    success: boolean;
    message: string;
    data?: Record<string, any>;
}

interface HealthCheckResponse {
    status: string;
    version: string;
}

interface CustomNotificationRequest {
    message: string;
    sender_name?: string;
    bot_id?: string;
}
// Main Client Class
export class GFPWAQRClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_CONFIG.BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Make HTTP request to API
     */
    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: any
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Check API health status
     */
    async checkHealth(): Promise<HealthCheckResponse> {
        return this.makeRequest<HealthCheckResponse>(API_CONFIG.ENDPOINTS.STATUS);
    }

    /**
     * Check if WhatsApp bot is registered
     */
    async checkRegistration(botId: string): Promise<WhatsAppBotResponse> {
        const request: WhatsAppBotCheckRegisterRequest = { bot_id: botId };
        return this.makeRequest<WhatsAppBotResponse>(
            API_CONFIG.ENDPOINTS.CHECK_REGISTER,
            'POST',
            request
        );
    }

    /**
     * Register new WhatsApp bot
     */
    async registerBot(botData: WhatsAppBotData): Promise<WhatsAppBotResponse> {
        const request: WhatsAppBotRegisterRequest = { bot: botData };
        return this.makeRequest<WhatsAppBotResponse>(
            API_CONFIG.ENDPOINTS.REGISTER,
            'POST',
            request
        );
    }

    /**
     * Update QR code for bot
     */
    async updateQR(botId: string, qrData: string): Promise<WhatsAppBotResponse> {
        const request: WhatsAppBotUpdateQRRequest = {
            bot_id: botId,
            qr_data: qrData
        };
        return this.makeRequest<WhatsAppBotResponse>(
            API_CONFIG.ENDPOINTS.UPDATE_QR,
            'POST',
            request
        );
    }

    /**
     * Update authentication state
     */
    async updateAuthState(
        botId: string,
        state: 'authed' | 'not_authed'
    ): Promise<WhatsAppBotResponse> {
        const request: WhatsAppBotAuthedStateRequest = {
            bot_id: botId,
            state: state
        };
        return this.makeRequest<WhatsAppBotResponse>(
            API_CONFIG.ENDPOINTS.UPDATE_AUTH_STATE,
            'POST',
            request
        );
    }

    /**
     * Complete bot initialization flow
     */
    async initializeBot(botData: WhatsAppBotData): Promise<boolean> {
        try {
            console.log('🔍 Checking bot registration...');

            // Check if bot is already registered
            const checkResponse = await this.checkRegistration(botData.id);

            if (checkResponse.success) {
                console.log('✅ Bot is already registered');
                return true;
            }

            console.log('📝 Registering new bot...');

            // Register the bot
            const registerResponse = await this.registerBot(botData);

            if (registerResponse.success) {
                console.log('✅ Bot registered successfully');
                return true;
            } else {
                console.error('❌ Failed to register bot:', registerResponse.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Bot initialization failed:', error);
            return false;
        }
    }

    /**
     * Send QR code to Telegram users
     */
    async sendQRCode(botId: string, qrData: string): Promise<boolean> {
        try {
            console.log('📱 Sending QR code to Telegram users...');

            const response = await this.updateQR(botId, qrData);

            if (response.success) {
                console.log('✅ QR code sent successfully');
                return true;
            } else {
                console.error('❌ Failed to send QR code:', response.message);
                return false;
            }
        } catch (error) {
            console.error('❌ QR code sending failed:', error);
            return false;
        }
    }

    /**
     * Update bot authentication status
     */
    async setAuthenticated(botId: string, isAuthenticated: boolean): Promise<boolean> {
        try {
            const state = isAuthenticated ? 'authed' : 'not_authed';
            console.log(`🔐 Updating auth state to: ${state}`);

            const response = await this.updateAuthState(botId, state);

            if (response.success) {
                console.log('✅ Auth state updated successfully');
                return true;
            } else {
                console.error('❌ Failed to update auth state:', response.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Auth state update failed:', error);
            return false;
        }
    }
    async sendCustomNotification(
        botId: string, // Теперь bot_id обязателен и на первом месте
        message: string,
        senderName: string = 'WhatsApp Bot'
    ): Promise<WhatsAppBotResponse> {
        const request: CustomNotificationRequest = {
            bot_id: botId,
            message: message,
            sender_name: senderName
        };

        return this.makeRequest<WhatsAppBotResponse>(
            API_CONFIG.ENDPOINTS.NOTIFY,
            'POST',
            request
        );
    }
}

// Usage Examples
export const createWhatsAppBotClient = (baseUrl?: string) => {
    return new GFPWAQRClient(baseUrl);
};

// Example usage in WhatsApp bot:
/*
import { createWhatsAppBotClient } from './whatsapp-bot-client';

const client = createWhatsAppBotClient('http://localhost:8010/api');

// Initialize bot
const botData = {
  id: '7e3f40511b178afb7f9e2c1a7a9e55af',
  name: 'Test Bot',
  description: 'Test Bot Description'
};

await client.initializeBot(botData);

// Send QR code
await client.sendQRCode(botData.id, 'base64_qr_data_here');

// Set authenticated
await client.setAuthenticated(botData.id, true);
*/