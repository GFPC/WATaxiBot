import {
    children_docs_collectionLegalInformation
} from "../../handlers/routes/order/children_docs_collectionLegalInformation";

const example = {
    "bot_legal_docs": {
        "privacy_policy":{
            "name": {
                "1": "Политика конфиденциальности",
                "2": "Privacy policy",
            },
            "content": [
                {
                    "version": 0,
                    "created": "2021-05-07 20:20:20",
                    "parts": [
                        {
                            "1": "Первая часть",
                            "2": "First part"
                        },
                        {
                            "1": "Вторая часть",
                            "2": "Second part"
                        },
                        {
                            "1": "Третья часть",
                            "2": "Third part"
                        }
                    ]
                },
                {
                    "version": 1,
                    "created": "2021-05-08 20:20:20",
                    "parts": [
                        {
                            "1": "Первая часть v2",
                            "2": "First part",
                        }
                    ]
                }
            ]
        }
    }
}

export interface BotLegalDocs {
    [key: string]: {
        name: {
            [langCode: string]: string; // Пример: "1": "Политика конфиденциальности"
        };
        content: [
            {
                version: number;
                created: string;
                parts: [
                    {
                        [langCode: string]: string; // Пример: "1": "Первая часть"
                    }
                ];
            }
        ];
    };
    // Можно добавить другие типы документов, если они будут
    // public_offers?: ...
    // legal_information?: ...
}

export function getLegalDocsVersionsMap(bot_legal_docs: BotLegalDocs): { [key: string]: string } {
    const legalDocsVersionsMap: { [key: string]: string } = {};
    Object.entries(bot_legal_docs).forEach(([key, value]) => {
        let maxVersion = 0;
        value.content.forEach((content) => {
            if (content.version > maxVersion) {
                maxVersion = content.version;
            }
        });
        legalDocsVersionsMap[key] = maxVersion.toString();
    });
    return legalDocsVersionsMap;
}
export function pickMaxVersion(content:  [
    {
        version: number;
        created: string;
        parts: [
            {
                [langCode: string]: string; // Пример: "1": "Первая часть"
            }
        ];
    }
]) : {
    version: number;
    created: string;
    parts: [
        {
            [langCode: string]: string; // Пример: "1": "Первая часть"
        }
    ];
} {
    let maxVersion = 0;
    let maxVersionIndex = 0;
    content.forEach((content, index ) => {
        if (content.version > maxVersion) {
            maxVersion = content.version;
            maxVersionIndex = index;
        }
    });
    return content[maxVersionIndex];
}