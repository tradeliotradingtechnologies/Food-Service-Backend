import AppSettings from "../models/appSettingsModel.js";
import AppError from "../utils/appError.js";
import type {
  AppSettingKey,
  IAppSettingsMap,
  IOrderSettings,
  IPaymentSettings,
  IProcessingFee,
  IReservationSettings,
} from "../types/model.types.js";

export const DEFAULT_APP_SETTINGS: IAppSettingsMap = {
  orders: {
    orderingEnabled: true,
    processingFee: { type: "fixed", amount: 0 },
    taxRate: 0,
    deliveryFee: 0,
    freeDeliveryThreshold: null,
  },
  reservations: {
    reservationsEnabled: true,
    minPartySize: 1,
    maxPartySize: 12,
    minAdvanceHours: 2,
    maxAdvanceDays: 30,
    openingTime: "09:00",
    closingTime: "22:00",
  },
  payments: {
    currency: "GHS",
    enabledMethods: ["mobile_money", "card", "cash_on_delivery"],
    paystackEnabled: true,
    allowManualConfirmation: true,
    refundWindowDays: 30,
  },
};

const SETTING_DESCRIPTIONS: Record<AppSettingKey, string> = {
  orders: "Order and checkout operational settings",
  reservations: "Reservation availability and booking rules",
  payments: "Payment provider and refund behavior settings",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeSection = <K extends AppSettingKey>(
  key: K,
  incoming?: Partial<IAppSettingsMap[K]> | null,
): IAppSettingsMap[K] => {
  const defaults = DEFAULT_APP_SETTINGS[key];
  if (!isObject(incoming)) return defaults;

  if (key === "orders") {
    const data = incoming as Partial<IOrderSettings>;
    return {
      ...defaults,
      ...data,
      processingFee: {
        ...DEFAULT_APP_SETTINGS.orders.processingFee,
        ...(isObject(data.processingFee) ? data.processingFee : {}),
      },
    } as IAppSettingsMap[K];
  }

  return {
    ...defaults,
    ...incoming,
  } as IAppSettingsMap[K];
};

export const getSettingSection = async <K extends AppSettingKey>(
  key: K,
): Promise<IAppSettingsMap[K]> => {
  const setting = await AppSettings.findOne({ key }).lean();
  const merged = mergeSection(
    key,
    (setting?.value as Partial<IAppSettingsMap[K]> | undefined) ?? undefined,
  );

  if (key === "orders") {
    const orderSettings = merged as IOrderSettings;
    const hasCategoryProcessingFee = isObject(setting?.value)
      ? "processingFee" in (setting?.value as Record<string, unknown>)
      : false;

    if (!hasCategoryProcessingFee) {
      const legacy = await AppSettings.findOne({
        key: "processing_fee",
      }).lean();
      if (legacy?.value && isObject(legacy.value)) {
        orderSettings.processingFee = {
          ...DEFAULT_APP_SETTINGS.orders.processingFee,
          ...(legacy.value as unknown as IProcessingFee),
        };
      }
    }

    return orderSettings as IAppSettingsMap[K];
  }

  return merged;
};

export const getAllSettingSections = async (): Promise<IAppSettingsMap> => {
  const [orders, reservations, payments] = await Promise.all([
    getSettingSection("orders"),
    getSettingSection("reservations"),
    getSettingSection("payments"),
  ]);

  return { orders, reservations, payments };
};

export const updateSettingSection = async <K extends AppSettingKey>(
  key: K,
  incoming: Partial<IAppSettingsMap[K]>,
  updatedBy: string,
): Promise<IAppSettingsMap[K]> => {
  const current = await getSettingSection(key);
  const merged = mergeSection(key, {
    ...current,
    ...incoming,
  });

  if (
    key === "reservations" &&
    (merged as IReservationSettings).minPartySize >
      (merged as IReservationSettings).maxPartySize
  ) {
    throw new AppError("minPartySize cannot be greater than maxPartySize", 400);
  }

  await AppSettings.findOneAndUpdate(
    { key },
    {
      value: merged,
      description: SETTING_DESCRIPTIONS[key],
      updatedBy,
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );

  if (key === "orders") {
    await AppSettings.findOneAndUpdate(
      { key: "processing_fee" },
      {
        value: (merged as IOrderSettings).processingFee,
        description: "Legacy processing fee setting mirrored from orders",
        updatedBy,
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
  }

  return merged;
};

export const getOrderSettings = () => getSettingSection("orders");
export const getReservationSettings = () => getSettingSection("reservations");
export const getPaymentSettings = () => getSettingSection("payments");
