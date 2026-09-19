import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy") {
  if (!date) return "";
  return format(new Date(date), fmt, { locale: ptBR });
}

export function formatDistance(date: string | Date) {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}
