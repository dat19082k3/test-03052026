import { ParamValue } from "next/dist/server/request/params";

export const createDateFormatter = (locale: ParamValue, timeZone?: string) => {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });
};

export const createCurrencyFormatter = (locale: ParamValue) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
  });
};