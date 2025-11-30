export const ServiceMap: {
    [key: string]: string;
} = {
    //"79135550015": "truck",//"gruzvill", //"children",
    "79999183175": "gruzvill",  //79999183175
    "34614478119": "children",
    "212778382140": "truck",
    //"639309965886": "children"
};
export const ConfigsMap: {
    [key: string]: {
        login: string;
        password: string;
        type: string;
    };
} = {
    children: {
        login: "admin@ibronevik.ru",
        password: "c|a197B1ba",
        type: "e-mail",
    },
    gruzvill: {
        login: "admin@ibronevik.ru",
        password: "p@ssw0rd",
        type: "e-mail",
    },
    truck: {
        login: "admin@ibronevik.ru",
        password: "p@ssw0rd",
        type: "e-mail",
    },
};
export const MultiUsersRefCodes: {
    [key: string]: {
        [key: string]: string;
    };
} = {
    /*"79135550015": {
        test: "666",
    },*/
    "79999183175": {
        test: "666",
    },
    "34614478119": {
        test: "666",
    },
    "212778382140": {
        test: "666",
    },
    "639309965886": {
        test: "666",
    },
};
