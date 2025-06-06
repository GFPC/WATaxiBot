export const URLManager = (
    urlPattern = "https://ibronevik.ru/taxi/c/%config%/api/v1/",
    serviceMap: {
        [key: string]: string;
    },
) => {
    let out: {
        [key: string]: string;
    } = {};
    for (let i in serviceMap) {
        out[i] = urlPattern.replace("%config%", serviceMap[i]);
    }
    return out;
};
