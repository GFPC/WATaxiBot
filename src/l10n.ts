export const systemLanguage = 'ru-RU';
import { readFileSync, writeFileSync } from 'fs';

export const localization = {
  welcome: "Добро пожаловать в бота для заказа такси!",
  sendFullName: "Для начала необходимо зарегистрироваться. Отправьте своё ФИО в формате Имя Отчество Фамилия.",
  sendRefCode: "Отлично! Теперь отправьте промокод. Если его нет, то напишите *0* (ноль)",
  registrationError: "Ошибка регистрации: %error%. Попробуйте позже.",
  registrationSuccessful: "Вы успешно зарегистрировались! Выберите дейтсвие из списка ниже.\n Создать заказ - *0* \n" + "Настройки - *1* \n" + "Чтобы создать заказ просто напишите *0* и следуйте инструкциям\n" +
      "В качестве начальной точки Вы можете использовать:\n" +
      "1. Конкретный адрес в виде текста, голосового сообщения или геолокации.\n" +
      "2. Отправить код места или фото с QR кодом.\n" +
      "3. Отправьте *Любимые места*, чтобы показать список любимых мест и выбрать из него.\n" +
      "4. Отправьте *Справочник*, чтобы выбрать район из справочника.",
  collectionTo: "Начальная точка установлена! Теперь, отправьте адрес конечной точки. ",
  collectionPeopleCount: "Конечная точка установлена! Отправьте кол-во людей в машине",
  topPlacesLower: "любимые места",
  handbookLower: "справочник",
  cancelLower: "отмена",
  orderCreatingCancel: "Создание заказа отменено",
  incorrectImageMediaType: "Некорректный формат медиа. Пожалуйста, отправьте изображение в формате PNG или JPG.",
  incorrectTextMessageType: "Пожалуйста, отправьте ответ в виде обычного текста.",
  incorrectNumeric: "Пожалуйста, отправьте ответ в виде числа.",
  largeFileSize: "Размер файла слишком большой",
  qrScanFailed: "Не удалось распознать QR-код",
  tooManyPeople: "Слишком много людей в заказе. Укажите меньшее кол-во или отмените заказ, написав *отмена* ( *0* ).",
  tooFewPeople: "Кол-во людей не может быть меньше 1. Укажите большее кол-во или отмените заказ, написав *отмена* ( *0* ).",
  collectionWhen: "Теперь укажите когда подать машину. " +
      "Если необходимо сейчас, то напишите *сейчас* ( *2* ). " +
      "Если сегодня в определённое время, то укажите время в формате *ЧЧ:СС*. " +
      "Если завтра в определённое время, то напишите *завтра ЧЧ:СС*.\n" +
      "Если вам нужен режим голосования, то отправьте слово *голосование* ( *3* ).",
  errorGeolocation: "Ошибка получении локации: %error%",
  locationNotFound: "Локация не найдена",
  votingLower: "голосование",
  nowLower: "сейчас",
  getTimestampError: "Не удалось распознать ваше сообщение. Попробуйте ещё раз.",
  timestampTimeout: "Переданное время уже прошло. Отправьте другое",
  collectionOrderConfirm: "*Ваш заказ:*\nНачальная точка: %from%.\nКонечная точка: %to%.\n" +
      "Кол-во людей: %peoplecount%.\nКогда: %when%.\n\n" +
      "Отправьте *подтвердить* ( *1* ) чтобы подтвердить заказ или *отмена* ( *0* ) чтобы его отменить.",
  confirmLower: "подтвердить",
  confirmPrompt: "Отправьте *подтвердить* чтобы подтвердить заказ или *отмена* чтобы его отменить.",
  votingActivated: "*Режим голосования активирован!* У вас есть 3 минуты.\n" +
      "Чтобы продлить время на 3 минуты отправьте *продлить* ( *2* ). Чтобы отменить заказ отправьте *отмена* ( *0* ).",
  error: "Произошла непредвиденная ошибка. Попробуйте повторить ещё раз или отменить заказ, написав *отмена*",
  stateProcessing: "Поиск машины...",
  stateApproved: "Машина найдена! Водитель (%driver%) уже едет к вам.\nЧтобы перейти в режим чата напишите *чат*.\n" + "Машина: %color% %model% %plate% \n" +
      "Чтобы отменить заказ напишите *отмена* ( *0* )",
  stateCanceled: "Заказ отменён",
  stateCompleted: "Заказ завершён. Пожалуйста, поставите оценку от 1 до 5 (если не хотите, напишите *0*)",
  stateOther: "Состояние заказа изменено на %state%",
  creatingOrder: "Создаём заказ...",
  errorWhenCreatingOrder: "Произошла непредвиденная ошибка, создание заказа отменено. Попробуйте сделать заказ позже",
  orderCreated: "Заказ создан! Ищем машину...\nЧтобы отменить поиск напишите *отмена* ( *0* )",
  collectionCancelReason: "Выберите причину отмены заказа из списка ниже:\n%reasons%.\nЧтобы отказаться от выбора причины напишите *отмена* ( *0* ).\nЕсли передумали, напишите *назад* ( *1* )",
  orderCanceled: "Заказ отменён. \nВыберите действие из списка ниже:\n" +
      "Создать заказ - напишите *0*\n" +
      "Настройки - напишите *1*\n",
  orderCompleted: "Чтобы создать новый заказ, напишите начальную точку",
  rateSet: "Оценка успешно поставлена",
  closeReasonSpecified: "Спасибо за обратную связь. Выберите действие из списка ниже:\n" +
      "Создать заказ - напишите *0*\n" +
      "Настройки - напишите *1*\n",
  stateWaitingVotingDriver: "Ждем водителя...",
  refCodeInvalid: "Неверный реферальный код, поробуйте другой или введите *0*",
  votingExtended: "Время голосования продлено на 3 минуты. Отправьте *продлить* ( *2* ) для продления или *отмена*( *0* ) для отмены. ",
  driverArrived: "Водитель уже прибыл и ожидает вас, его номер телефона: %phone%",
  driverCanceled: "Водитель отменил заказ. Для остановки поиска напишите *отмена* ( *0* )\nПоиск машины...",
  driverCompleted: "Водитель завершил заказ. Пожалуйста, поставьте оценку от 1 до 5 (если не хотите, напишите *0*)",
  driverStarted: "Водитель начал поездку",
  cancelDigital: "0",
  defaultPrompt: "Выберите действие из списка ниже:\n" +
      "Создать заказ - напишите *0*\n" +
      "Настройки - напишите *1*\n",
  commandNotFound: "Команда не распознана.\nВыберите действие из списка ниже:\n" +
      "Создать заказ - напишите *0*\n" +
      "Настройки - напишите *1*\n",
  settingsMenu: "Настройки\n" +
      "Текущий язык - %language%\n" +
      "\n" +
      "Сменить язык - напишите *1*\n" +
      "Для выхода из меню - напишите *0*",
  selectLanguage: "Выберите язык из списка ниже:",
  langSelectedBakingToSettings: "Язык выбран, возврат в меню настроек",
  carModelNotSpecified: "`Модель не указана`",
  carColorNotSpecified: "`Цвет не указан`",
  enterStartPoint: "Отправьте адрес начальной точки. Чтобы отменить заказ, в любой момент напишите *отмена* ( *0* )",
  votingVerificationCode: "Код верификации данной поездки: %code% \nСообщите его водителю",
  orderCancellationInterrupted: "Отмена заказа прервана",
  answerBackLower: "назад",
  tomorrowLower: "завтра",
  votingTimer: "До окончания ожидания: *%time%* сек",
  votingTimerNotification: "Время ожидания заканчивается. Осталось *%time%* сек.\nДанное сообщение будет удалено через 5 секунд",
  votingTimerExpired: "Время ожидания вышло. Чтобы создать новый заказ, напишите начальную точку",
  extendVotingTimeLower: "продлить",
  votingTimerNotActive: "Данный таймер больше не активен, активный можно найти ниже",
}
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
  langSelectedBakingToSettings: "wab_langSelectedBakingToSettings".toLowerCase(),
  carModelNotSpecified: "wab_carModelNotSpecified".toLowerCase(),
  carColorNotSpecified: "wab_carColorNotSpecified".toLowerCase(),
  enterStartPoint: "wab_enterStartPoint".toLowerCase(),
  votingVerificationCode: "wab_votingVerificationCode".toLowerCase(),
  orderCancellationInterrupted: "wab_orderCancellationInterrupted".toLowerCase(),
  answerBackLower: "wab_answerBackLower".toLowerCase(),
  tomorrowLower: "wab_tomorrowLower".toLowerCase(),
  votingTimer: "wab_votingTimer".toLowerCase(),
  votingTimerNotification: "wab_votingTimerNotification".toLowerCase(),
  votingTimerExpired: "wab_votingTimerExpired".toLowerCase(),
  extendVotingTimeLower: "wab_extendVotingTimeLower".toLowerCase(),
  votingTimerNotActive: "wab_votingTimerNotActive".toLowerCase(),
}
function exportToJsonFile() {
  const file = "l10n.json";
  writeFileSync(file, JSON.stringify(localization, null, 4),{flag: 'w'});
}
exportToJsonFile()