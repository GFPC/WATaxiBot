export const systemLanguage = "ru-RU";
import { readFileSync, writeFileSync } from "fs";

export const localization = {
    welcome: "Добро пожаловать в бота для заказа такси!",
    sendFullName:
        "Для начала необходимо зарегистрироваться. Отправьте свое имя",
    sendRefCode:
        "Отлично! Теперь отправьте промокод. Если его нет, то напишите ( *0* )",
    registrationError: "Ошибка регистрации: %error%. Попробуйте позже.",
    registrationSuccessful:
        "Вы успешно зарегистрировались! Выберите дейтсвие из списка ниже.\n Создать заказ - ( *0* ) \n" +
        "Настройки - ( *1* ) \n" +
        "Чтобы создать заказ просто напишите ( *0* ) и следуйте инструкциям\n" +
        "В качестве начальной точки Вы можете использовать:\n" +
        "1. Конкретный адрес в виде текста, голосового сообщения или геолокации.\n" +
        "2. Отправить код места или фото с QR кодом.\n" +
        "3. Отправьте ( *01* ), чтобы показать список любимых мест и выбрать из него.\n" +
        "4. Отправьте ( *02* ), чтобы выбрать район из справочника.",
    collectionTo:
        "Начальная точка установлена! Теперь, отправьте адрес конечной точки. ",
    collectionPeopleCount:
        "Конечная точка установлена! Отправьте кол-во людей в машине",
    topPlacesLower: "любимые места",
    handbookLower: "справочник",
    cancelLower: "отмена",
    orderCreatingCancel: "Создание заказа отменено",
    incorrectImageMediaType:
        "Некорректный формат медиа. Пожалуйста, отправьте изображение в формате PNG или JPG.",
    incorrectTextMessageType:
        "Пожалуйста, отправьте ответ в виде обычного текста.",
    incorrectNumeric: "Пожалуйста, отправьте ответ в виде числа.",
    largeFileSize: "Размер файла слишком большой",
    qrScanFailed: "Не удалось распознать QR-код",
    tooManyPeople:
        "Слишком много людей в заказе. Укажите меньшее кол-во или отмените заказ, написав ( *0* ).",
    tooFewPeople:
        "Кол-во людей не может быть меньше 1. Укажите большее кол-во или отмените заказ, написав ( *0* ).",
    collectionWhen:
        "Теперь укажите когда подать машину. " +
        "Если необходимо сейчас, то напишите ( *2* ). " +
        "Если сегодня в определённое время, то укажите время в формате *ЧЧ:СС*. " +
        "Если завтра в определённое время, то напишите *завтра ЧЧ:СС*.\n" +
        "Если вам нужен режим голосования, то отправьте ( *3* ).",
    errorGeolocation: "Ошибка получении локации: %error%",
    locationNotFound: "Локация не найдена",
    votingLower: "голосование",
    nowLower: "сейчас",
    getTimestampError:
        "Не удалось распознать ваше сообщение. Попробуйте ещё раз.",
    timestampTimeout: "Переданное время уже прошло. Отправьте другое",
    collectionOrderConfirm:
        "*Ваш заказ:*\nНачальная точка: %from%.\nКонечная точка: %to%.\n" +
        "Кол-во людей: %peoplecount%.\nКогда: %when%.\nДополнительные опции: %options%\n\n" +
        "Отправьте ( *1* ) чтобы подтвердить заказ или ( *0* ) чтобы его отменить.",
    confirmLower: "подтвердить",
    confirmPrompt:
        "Отправьте ( *1* ) чтобы подтвердить заказ или ( *0* ) чтобы его отменить.",
    votingActivated:
        "*Режим голосования активирован!* У вас есть 3 минуты.\n" +
        "Чтобы продлить время на 3 минуты отправьте ( *2* ). Чтобы расширить чаевые на подачу введите ( *3* ). Чтобы отменить заказ отправьте ( *0* ).",
    error: "Произошла непредвиденная ошибка. Попробуйте повторить ещё раз или отменить заказ, написав ( *0* ).",
    stateProcessing: "Поиск машины...",
    stateApproved:
        "Машина найдена! Водитель (%driver%) уже едет к вам.\nЧтобы перейти в режим чата напишите *чат*.\n" +
        "Машина: %color% %model% %plate% \n" +
        "Чтобы отменить заказ напишите ( *0* )",
    stateCanceled: "Заказ отменён",
    stateCompleted:
        "Заказ завершён. Пожалуйста, поставите оценку от 1 до 5 (если не хотите, напишите *0*)",
    stateOther: "Состояние заказа изменено на %state%",
    creatingOrder: "Создаём заказ...",
    errorWhenCreatingOrder:
        "Произошла непредвиденная ошибка, создание заказа отменено. Попробуйте сделать заказ позже",
    orderCreated:
        "Заказ создан! Ищем машину...\nВаш заказ видят сейчас N  водителей, среднее ожидание М минут. Вы можете доплатить сумму на подачу ( *2* ) и ваш заказ смогут взять  больше водителей.\nЧтобы отменить поиск напишите ( *0* )",
    collectionCancelReason:
        "Выберите причину отмены заказа из списка ниже:\n%reasons%.\nЧтобы отказаться от выбора причины напишите ( *0* ).\nЕсли передумали, напишите ( *01* )",
    orderCanceled:
        "Заказ отменён. \nВыберите действие из списка ниже:\n" +
        "Создать заказ - напишите ( *0* )\n" +
        "Настройки - напишите ( *1* )\n",
    orderCompleted: "Чтобы создать новый заказ, напишите начальную точку",
    rateSet:
        "Оценка успешно поставлена. Вы можете ввести текстовый комментарий под этим сообщением, для отмены напишите ( *0* )",
    closeReasonSpecified:
        "Спасибо за обратную связь. Выберите действие из списка ниже:\n" +
        "Создать заказ - напишите ( *0* )\n" +
        "Настройки - напишите ( *1* )\n",
    stateWaitingVotingDriver: "Ждем водителя...",
    refCodeInvalid:
        "Неверный реферальный код, поробуйте другой или введите ( *0* )",
    votingExtended:
        "Время голосования продлено на 3 минуты. Отправьте ( *2* ) для продления или ( *0* ) для отмены. ",
    driverArrived:
        "Водитель уже прибыл и ожидает вас, его номер телефона: %phone%",
    driverCanceled:
        "Водитель отменил заказ. Для остановки поиска напишите ( *0* )\nПоиск машины...",
    driverCompleted:
        "Водитель завершил заказ. Пожалуйста, поставьте оценку от 1 до 5 (если не хотите, напишите *0*)",
    driverStarted: "Водитель начал поездку",
    cancelDigital: "0",
    defaultPrompt:
        "Выберите действие из списка ниже:\n" +
        "Создать заказ - напишите ( *0* )\n" +
        "Настройки - напишите ( *1* )\n" +
        "Помощь - напишите ( *9* )\n",
    commandNotFound:
        "Команда не распознана.\nВыберите действие из списка ниже:\n",
    settingsMenu:
        "Настройки\n" +
        "Текущий язык - *%language%*\n" +
        "Текущий реферальный код - *%refCode%*\n" +
        "Предыдущий реферальный код - *%prevRefCode%*\n" +
        "Ваш реферальный код - *%selfRefCode%*\n" +
        "\n" +
        "Сменить реферальный код - напишите ( *2* )\n" +
        "Сменить язык - напишите ( *1* )\n" +
        "Для выхода из меню - напишите ( *0* )",
    selectLanguage: "Выберите язык из списка ниже:",
    langSelectedBakingToSettings: "Язык выбран, возврат в меню настроек",
    carModelNotSpecified: "`Модель не указана`",
    carColorNotSpecified: "`Цвет не указан`",
    enterStartPoint:
        "Отправьте адрес начальной точки. Чтобы отменить заказ, в любой момент напишите ( *0* )",
    votingVerificationCode:
        "Код верификации данной поездки: %code% \nСообщите его водителю",
    orderCancellationInterrupted: "Отмена заказа прервана",
    answerBackLower: "назад",
    tomorrowLower: "завтра",
    votingTimer: "До окончания ожидания: *%time%* сек",
    votingTimerNotification:
        "Время ожидания заканчивается. Осталось *%time%* сек.\nДанное сообщение будет удалено через 5 секунд",
    votingTimerExpired:
        "Время ожидания вышло. Чтобы создать новый заказ, напишите начальную точку",
    extendVotingTimeLower: "продлить",
    votingTimerNotActive:
        "Данный таймер больше не активен, активный можно найти ниже",
    orderClosedByAPI:
        "Заказ закрыт по истечению времени ожидания отклика водителей. \n\n",
    newReferralCodeCollection:
        "Введите реферальный код, для отмены введите ( *0* )",
    changeReferralCodeSuccess: "Реферальный код изменен",
    changeReferralCodeErrorEqual:
        "Новый реферальный код не может быть равен старому",
    help:
        "Выберите дейтсвие из списка ниже.\n Создать заказ - ( *0* ) \n" +
        "Настройки - ( *1* ) \n" +
        "Чтобы создать заказ просто напишите ( *0* ) и следуйте инструкциям\n" +
        "В качестве начальной точки Вы можете использовать:\n" +
        "1. Конкретный адрес в виде текста, голосового сообщения или геолокации.\n" +
        "2. Отправить код места или фотpyо с QR кодом.\n" +
        "3. Отправьте ( *01* ), чтобы показать список любимых мест и выбрать из него.\n" +
        "4. Отправьте ( *02* ), чтобы выбрать район из справочника.",
    needAdditionalOptionsQuestion:
        "Нужны дополнительные опции? Введите ( *1* ) для получения списка дополнительных опций, если они не требуются, введите ( *2* )",
    selectAdditionalOptions:
        "Выберите дополнительные опции из списка ниже, укажите цифрами через пробел, если не требуются, введите ( *00* ):",
    collectionAdditionalOptionsError:
        "Вы ввели некорректные значения. Попробуйте ещё раз",
    commentReceived: "Ваш отзыв принят",

    enterStartPriceSum:
        "Введите сумму, на которую хотите расширить чаевые на подачу. " +
        "Помните, что данная сумма прибавится к предыдущей." +
        "\n*Важно: чаевые на подачу невозможно уменьшить, действие необратимо*\n" +
        " Чтобы отменить данное действие, напишите ( *00* )",
    enterStartPriceCommandNotFoundRide:
        "Команда не распознана. На данном этапе просиходит поиск машины, чтобы отменить заказ, напишите ( *0* ), чтобы расширить чаевые на подачу, напишите ( *2* )",
    extendingStartPriceClosed:
        "Расширение чаевых на подачу отменено, продолжается поиск машины...",
    enterStartPriceSumMustBeNumber:
        "Сумма должна быть числом, попробуйте еще раз. Напишите ( *00* ), чтобы отменить действие",
    enterStartPriceSumMustBePositive:
        "Сумма должна быть положительным числом, попробуйте еще раз. Напишите ( *00* ), чтобы отменить действие",
    startPriceExtended:
        "Чаевые расширены, текущая сумма: %price% %currency%\n" +
        "\nПродолжается поиск машины...",
    helpStartPoint:
        "📍 *Выбор начальной точки*\n\n📝 На данном этапе доступны следующие варианты команд:\n1. Отправьте конкретный адрес в виде текста, голосового сообщения или геолокации.\n2. Отправьте код места или фото с QR-кодом.\n3. Напишите ( *01* ), чтобы выбрать из списка сохранённых мест.\n4. Напишите ( *02* ), чтобы выбрать район из справочника.\n\nЧтобы отменить заказ, в любой момент напишите ( *0* ).",
    helpEndPoint:
        "📍 *Выбор конечной точки*\n\n📝 На данном этапе доступны следующие варианты команд:\n1. Отправьте конкретный адрес в виде текста, голосового сообщения или геолокации.\n2. Отправьте код места или фото с QR-кодом.\n3. Напишите ( *01* ), чтобы выбрать из списка сохранённых мест.\n4. Напишите ( *02* ), чтобы выбрать район из справочника.\n\nЧтобы отменить заказ, в любой момент напишите ( *0* ).",
    settingsTestModeHint:
        "📝 Для перехода в режим тестирования нажмите смените реферальный код на *test*",
    settingsTestModeActive:
        "📝 Тестовый режим активирован. Отключить тестовый режим можно сменой реферального кода на предыдущее значение, оно указано в настройках",
    settingsPreviousReferralCode: "📝 Предыдущий реферальный код: %code%",
    settingsExitTestModeError:
        "❌ В тестовом режиме недоступна смена реферального кода на значения, не равные предыдущему. Чтобы выйти из тестового режима смените реферальный код на предыдущее значение, оно указано в настройках",
    invalidReferralCode: "❌ Некорректный реферальный код",
    public_offers:
        "*Публичная оферта*.\nЕсли согласны - введите ( *1* ), если нет - введите ( *0* ).",
    privacy_policy:
        "*Политика конфиденциальности*.\nЕсли согласны - введите ( *1* ), если нет - введите ( *2* ).",
    legal_information:
        "*Юридическая информация*.\nЕсли согласны - введите ( *1* ), если нет - введите ( *2* ).",
    reject_terms:
        "Вы не приняли условия сервиса и не можете использовать его. В любой момент вы можеет согласиться с условиями, введя ( *1* ).",
    invalid_language: "❌ Введен некорректный код языка, попробуйте ещё раз",
    next_step: "Для перехода к следующему шагу введите ( *3* )",
};
export const localizationNames = {
    welcome: "wab_welcome".toLowerCase(),
    sendFullName: "wab_sendFullName".toLowerCase(),
    sendRefCode: "wab_sendRefCode".toLowerCase(),
    registrationError: "wab_registrationError".toLowerCase(),
    registrationSuccessful: "wab_registrationSuccessful".toLowerCase(),
    collectionTo: "wab_collectionTo".toLowerCase(),
    collectionPeopleCount: "wab_collectionPeopleCount".toLowerCase(),
    topPlacesLower: "wab_topPlacesLower".toLowerCase(),
    handbookLower: "wab_handbookLower".toLowerCase(),
    cancelLower: "wab_cancelLower".toLowerCase(),
    orderCreatingCancel: "wab_orderCreatingCancel".toLowerCase(),
    incorrectImageMediaType: "wab_incorrectImageMediaType".toLowerCase(),
    incorrectTextMessageType: "wab_incorrectTextMessageType".toLowerCase(),
    incorrectNumeric: "wab_incorrectNumeric".toLowerCase(),
    largeFileSize: "wab_largeFileSize".toLowerCase(),
    qrScanFailed: "wab_qrScanFailed".toLowerCase(),
    tooManyPeople: "wab_tooManyPeople".toLowerCase(),
    tooFewPeople: "wab_tooFewPeople".toLowerCase(),
    collectionWhen: "wab_collectionWhen".toLowerCase(),
    errorGeolocation: "wab_errorGeolocation".toLowerCase(),
    locationNotFound: "wab_locationNotFound".toLowerCase(),
    votingLower: "wab_votingLower".toLowerCase(),
    nowLower: "wab_nowLower".toLowerCase(),
    getTimestampError: "wab_getTimestampError".toLowerCase(),
    timestampTimeout: "wab_timestampTimeout".toLowerCase(),
    collectionOrderConfirm: "wab_collectionOrderConfirm".toLowerCase(),
    collectionOrderConfirmTestMode:
        "wab_collectionOrderConfirmTestMode".toLowerCase(),
    confirmLower: "wab_confirmLower".toLowerCase(),
    confirmPrompt: "wab_confirmPrompt".toLowerCase(),
    votingActivated: "wab_votingActivated".toLowerCase(),
    error: "wab_error".toLowerCase(),
    stateProcessing: "wab_stateProcessing".toLowerCase(),
    stateApproved: "wab_stateApproved".toLowerCase(),
    stateCanceled: "wab_stateCanceled".toLowerCase(),
    stateCompleted: "wab_stateCompleted".toLowerCase(),
    stateOther: "wab_stateOther".toLowerCase(),
    creatingOrder: "wab_creatingOrder".toLowerCase(),
    errorWhenCreatingOrder: "wab_errorWhenCreatingOrder".toLowerCase(),
    orderCreated: "wab_orderCreated".toLowerCase(),
    collectionCancelReason: "wab_collectionCancelReason".toLowerCase(),
    orderCanceled: "wab_orderCanceled".toLowerCase(),
    cancelCanceled: "wab_cancelCanceled".toLowerCase(),
    orderCompleted: "wab_orderCompleted".toLowerCase(),
    rateSet: "wab_rateSet".toLowerCase(),
    closeReasonSpecified: "wab_closeReasonSpecified".toLowerCase(),
    stateWaitingVotingDriver: "wab_stateWaitingVotingDriver".toLowerCase(),
    refCodeInvalid: "wab_refCodeInvalid".toLowerCase(),
    votingExtended: "wab_votingExtended".toLowerCase(),
    driverArrived: "wab_driverArrived".toLowerCase(),
    driverCanceled: "wab_driverCanceled".toLowerCase(),
    driverCompleted: "wab_driverCompleted".toLowerCase(),
    driverStarted: "wab_driverStarted".toLowerCase(),
    cancelDigital: "wab_cancelDigital".toLowerCase(),
    defaultPrompt: "wab_defaultPrompt".toLowerCase(),
    commandNotFound: "wab_commandNotFound".toLowerCase(),
    settingsMenu: "wab_settingsMenu".toLowerCase(),
    selectLanguage: "wab_selectLanguage".toLowerCase(),
    langSelectedBakingToSettings:
        "wab_langSelectedBakingToSettings".toLowerCase(),
    carModelNotSpecified: "wab_carModelNotSpecified".toLowerCase(),
    carColorNotSpecified: "wab_carColorNotSpecified".toLowerCase(),
    enterStartPoint: "wab_enterStartPoint".toLowerCase(),
    votingVerificationCode: "wab_votingVerificationCode".toLowerCase(),
    orderCancellationInterrupted:
        "wab_orderCancellationInterrupted".toLowerCase(),
    answerBackLower: "wab_answerBackLower".toLowerCase(),
    tomorrowLower: "wab_tomorrowLower".toLowerCase(),
    votingTimer: "wab_votingTimer".toLowerCase(),
    votingTimerNotification: "wab_votingTimerNotification".toLowerCase(),
    votingTimerExpired: "wab_votingTimerExpired".toLowerCase(),
    extendVotingTimeLower: "wab_extendVotingTimeLower".toLowerCase(),
    votingTimerNotActive: "wab_votingTimerNotActive".toLowerCase(),
    orderClosedByAPI: "wab_orderClosedByAPI".toLowerCase(),
    newReferralCodeCollection: "wab_newReferralCodeCollection".toLowerCase(),
    changeReferralCodeSuccess: "wab_changeReferralCodeSuccess".toLowerCase(),
    changeReferralCodeErrorEqual:
        "wab_changeReferralCodeErrorEqual".toLowerCase(),
    help: "wab_help".toLowerCase(),
    needAdditionalOptionsQuestion:
        "wab_needAdditionalOptionsQuestion".toLowerCase(),
    selectAdditionalOptions: "wab_selectAdditionalOptions".toLowerCase(),
    collectionAdditionalOptionsError:
        "wab_collectionAdditionalOptionsError".toLowerCase(),
    commentReceived: "wab_commentReceived".toLowerCase(),
    enterStartPriceSum: "wab_enterStartPriceSum".toLowerCase(),
    enterStartPriceCommandNotFoundRide:
        "wab_enterStartPriceCommandNotFoundRide".toLowerCase(),
    extendingStartPriceClosed: "wab_extendingStartPriceClosed".toLowerCase(),
    enterStartPriceSumMustBeNumber:
        "wab_enterStartPriceSumMustBeNumber".toLowerCase(),
    enterStartPriceSumMustBePositive:
        "wab_enterStartPriceSumMustBePositive".toLowerCase(),
    startPriceExtended: "wab_startPriceExtended".toLowerCase(),
    helpStartPoint: "wab_helpStartPoint".toLowerCase(),
    helpEndPoint: "wab_helpEndPoint".toLowerCase(),
    settingsTestModeHint: "wab_settingsTestModeHint".toLowerCase(),
    settingsTestModeActive: "wab_settingsTestModeActive".toLowerCase(),
    settingsPreviousReferralCode:
        "wab_settingsPreviousReferralCode".toLowerCase(),
    settingsExitTestModeError: "wab_settingsExitTestModeError".toLowerCase(),
    invalidReferralCode: "wab_invalidReferralCode".toLowerCase(),
    public_offers: "wab_public_offers".toLowerCase(),
    privacy_policy: "wab_privacy_policy".toLowerCase(),
    legal_information: "wab_legal_information".toLowerCase(),
    reject_terms: "wab_reject_terms".toLowerCase(),
    invalid_language: "wab_invalid_language".toLowerCase(),
    public_offers_big: "wab_public_offers_big".toLowerCase(),
    privacy_policy_big: "wab_privacy_policy_big".toLowerCase(),
    legal_information_big: "wab_legal_information_big".toLowerCase(),
    expand_doc: "wab_expand_doc".toLowerCase(),
    collapse_doc: "wab_collapse_doc".toLowerCase(),
    next_step: "wab_next_step".toLowerCase(),
    accept_doc: "wab_accept_doc".toLowerCase(),
    calculatingRoute: "wab_calculatingRoute".toLowerCase(),
    askDeleteAccount: "wab_askDeleteAccount".toLowerCase(),
    accountDeleted: "wab_accountDeleted".toLowerCase(),
    accountDeletionCanceled: "wab_accountDeletionCanceled".toLowerCase(),
    accountRecovery: "wab_accountRecovery".toLowerCase(),
    askShowCarClass: "wab_askShowCarClass".toLowerCase(),
    selectCarClass: "wab_selectCarClass".toLowerCase(),
};
function exportToJsonFile() {
    const file = "l10n.json";
    writeFileSync(file, JSON.stringify(localization, null, 4), { flag: "w" });
}
exportToJsonFile();
