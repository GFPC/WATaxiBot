interface CarLicense {
    id?: number;
    ru?: string;
    en?: string;
    ar?: string;
    fr?: string;
    about_ru?: string;
    about_en?: string;
    about_ar?: string;
    about_fr?: string;
    active?: 0 | 1;
    b_l_c?: Array<{
        location: string; // тип дальности из data.booking_location_classes
        value: any; // объект зависит от data.booking_location_classes[id].alias (страна/регион/город)
        tariff: number;
        currency: string; // валюта из data.currencies
    }>;
    exact?: 0 | 1; // если 1, массив свойств точно будет равен b_l_c
}

export default interface Car {
    c_id: string; // идентификатор машины
    cm_id: string; // идентификатор модели машины (ссылка на data.car_models)
    u_id: string; // список идентификаторов пользователей через запятую
    u_d_id?: string; // идентификатор пользователя за рулем
    seats: string; // число мест в машине
    registration_plate: string; // автомобильный номер
    color: string; // идентификатор цвета машины (ссылка на data.car_colors)
    photo?: string; // ссылка на фото
    details?: any; // json данные для дальнейшей обработки (только для администратора)
    cc_id: string; // идентификатор класса машины (ссылка на data.car_classes)
    licenses?: CarLicense[]; // массив лицензий
}